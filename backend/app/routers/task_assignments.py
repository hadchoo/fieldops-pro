import uuid
from fastapi import APIRouter

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.user import User
from app.models.membership import Membership
from app.models.event import Event
from app.models.task import Task
from app.models.task_assignment import TaskAssignment

from app.schemas.task_assignment import (
    TaskAssignmentCreate,
    TaskAssignmentRead
)


router = APIRouter(
    prefix="/api/v1/task-assignments",
    tags=["Task Assignments"]
)



# ASSIGN USER TO TASK
@router.post(
    "",
    response_model=TaskAssignmentRead,
    status_code=status.HTTP_201_CREATED
)
def create_task_assignment(
    assignment_data: TaskAssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    task = db.scalar(
        select(Task).where(
            Task.id == assignment_data.task_id
        )
    )

    if task is None:
        raise HTTPException(404, "Task not found")

    event = db.scalar(
        select(Event).where(
            Event.id == task.event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(404, "Task not found")

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(404, "Task not found")

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(403, "Permission denied")

    assigned_member = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == assignment_data.user_id,
            Membership.status == "active"
        )
    )

    if assigned_member is None:
        raise HTTPException(
            400,
            "Assigned user must be an active organization member"
        )

    assignment = TaskAssignment(
        task_id=assignment_data.task_id,
        user_id=assignment_data.user_id
    )

    db.add(assignment)

    try:
        db.commit()
        db.refresh(assignment)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409,
            "User is already assigned to this task"
        )

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            500,
            "Could not create task assignment"
        )

    return assignment


# GET TASK ASSIGNMENTS
@router.get(
    "",
    response_model=list[TaskAssignmentRead]
)
def get_task_assignments(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if task is None:
        raise HTTPException(404, "Task not found")

    event = db.scalar(
        select(Event).where(
            Event.id == task.event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(404, "Task not found")

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(404, "Task not found")

    assignments = db.scalars(
        select(TaskAssignment)
        .where(TaskAssignment.task_id == task_id)
        .order_by(
            TaskAssignment.created_at,
            TaskAssignment.id
        )
    ).all()

    return assignments


# DELETE TASK ASSIGNMENT
@router.delete(
    "/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_task_assignment(
    assignment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    assignment = db.scalar(
        select(TaskAssignment).where(
            TaskAssignment.id == assignment_id
        )
    )

    if assignment is None:
        raise HTTPException(404, "Assignment not found")

    task = db.scalar(
        select(Task).where(
            Task.id == assignment.task_id
        )
    )

    if task is None:
        raise HTTPException(404, "Assignment not found")

    event = db.scalar(
        select(Event).where(
            Event.id == task.event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(404, "Assignment not found")

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(404, "Assignment not found")

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(403, "Permission denied")

    try:
        db.delete(assignment)
        db.commit()

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            500,
            "Could not delete task assignment"
        )
