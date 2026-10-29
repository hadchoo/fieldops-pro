
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user

from app.models.user import User
from app.models.membership import Membership
from app.models.event import Event
from app.models.task import Task
from app.models.task_assignment import TaskAssignment

from app.schemas.task import (
    TaskCreate,
    TaskRead,
    TaskStatusUpdate,
    TaskUpdate
)


router = APIRouter(
    prefix="/api/v1/tasks",
    tags=["Tasks"]
)


# CREATE TASK
@router.post(
    "",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED
)
def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    event = db.scalar(
        select(Event).where(
            Event.id == task_data.event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    new_task = Task(
        event_id=event.id,
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        due_at=task_data.due_at
    )

    try:
        db.add(new_task)
        db.commit()
        db.refresh(new_task)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create task"
        )

    return new_task


# GET TASKS
@router.get(
    "",
    response_model=list[TaskRead]
)
def get_tasks(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    event = db.scalar(
        select(Event).where(
            Event.id == event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    tasks = db.scalars(
        select(Task)
        .where(
            Task.event_id == event_id
        )
        .order_by(
            Task.created_at.asc(),
            Task.id.asc()
        )
    ).all()

    return tasks


# GET MY ASSIGNED TASKS
@router.get(
    "/my",
    response_model=list[TaskRead]
)
def get_my_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    tasks = db.scalars(
        select(Task)
        .join(
            TaskAssignment,
            TaskAssignment.task_id == Task.id
        )
        .join(
            Event,
            Event.id == Task.event_id
        )
        .join(
            Membership,
            Membership.organization_id == Event.organization_id
        )
        .where(
            TaskAssignment.user_id == current_user.id,
            Membership.user_id == current_user.id,
            Membership.status == "active",
            Event.archived_at.is_(None)
        )
        .order_by(
            Task.created_at.desc(),
            Task.id
        )
    ).all()

    return tasks


# UPDATE TASK STATUS
@router.patch(
    "/{task_id}/status",
    response_model=TaskRead
)
def update_task_status(
    task_id: uuid.UUID,
    status_data: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    event = db.scalar(
        select(Event).where(
            Event.id == task.event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    # Owner and Admin can update any task status.
    # Other active members must be assigned to the task.
    # Viewers cannot update task status.
    if membership.role not in ["Owner", "Admin"]:

        if membership.role == "Viewer":
            raise HTTPException(
                status_code=403,
                detail="Permission denied"
            )

        assignment = db.scalar(
            select(TaskAssignment).where(
                TaskAssignment.task_id == task.id,
                TaskAssignment.user_id == current_user.id
            )
        )

        if assignment is None:
            raise HTTPException(
                status_code=403,
                detail="Permission denied"
            )

    if task.status == status_data.status:
        return task

    task.status = status_data.status

    try:
        db.commit()
        db.refresh(task)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update task status"
        )

    return task


# UPDATE TASK
@router.patch(
    "/{task_id}",
    response_model=TaskRead
)
def update_task(
    task_id: uuid.UUID,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    task = db.scalar(
        select(Task).where(
            Task.id == task_id
        )
    )

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    event = db.scalar(
        select(Event).where(
            Event.id == task.event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    update_data = task_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(task, field, value)

    try:
        db.commit()
        db.refresh(task)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update task"
        )

    return task
