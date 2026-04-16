from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, UTC
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class AgentRole:
    name: str
    goal: str
    allowed_paths: list[str] = field(default_factory=list)
    deliverables: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ManagedTask:
    task_id: str
    title: str
    summary: str
    status: str
    owner: str
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    validation: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)


@dataclass(slots=True)
class WorkflowPlan:
    objective: str
    manager_notes: list[str]
    roles: list[AgentRole]
    tasks: list[ManagedTask]
    generated_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class WorkflowRunResult:
    objective: str
    mode: str
    crewai_available: bool
    plan: dict[str, Any]
    execution_order: list[str]
    crew_summary: dict[str, Any]
    generated_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


DEFAULT_ROLES = [
    AgentRole(
        name="Manager",
        goal="Read the objective, choose the smallest valid next slice, assign work, and enforce boundaries.",
        allowed_paths=["docs/", "fablemap/", "tests/", "frontend/"],
        deliverables=[
            "Task breakdown with status flow",
            "Ownership decisions",
            "Blocked/risk summary",
        ],
    ),
    AgentRole(
        name="Builder",
        goal="Implement the approved slice only within the manager-defined file boundaries.",
        allowed_paths=["fablemap/", "frontend/", "scripts/", "tests/"],
        deliverables=[
            "Code changes",
            "Notes about assumptions and touched files",
        ],
    ),
    AgentRole(
        name="Tester",
        goal="Validate the slice with the smallest meaningful checks and report regressions clearly.",
        allowed_paths=["tests/", "fablemap/", "frontend/"],
        deliverables=[
            "Verification summary",
            "Failed checks and probable causes",
        ],
    ),
    AgentRole(
        name="Documenter",
        goal="Keep tasklist, claim, and change records aligned with the real implementation state.",
        allowed_paths=["docs/", "README.md"],
        deliverables=[
            "Tasklist update",
            "Claim/change record suggestions",
            "Usage notes",
        ],
    ),
]


def build_initial_plan(objective: str) -> WorkflowPlan:
    normalized = objective.strip()
    if not normalized:
        raise ValueError("objective must not be empty")

    tasks = [
        ManagedTask(
            task_id="T1",
            title="Clarify scope and acceptance",
            summary="Manager translates the raw request into a bounded slice with explicit acceptance checks.",
            status="planned",
            owner="Manager",
            inputs=["raw objective", "current repo state", "shared tasklist"],
            outputs=["bounded scope", "acceptance checklist"],
            validation=["Scope mentions allowed files", "Scope mentions what is out of bounds"],
        ),
        ManagedTask(
            task_id="T2",
            title="Implement the smallest useful slice",
            summary="Builder changes only the files needed for the agreed slice.",
            status="planned",
            owner="Builder",
            inputs=["scope from T1"],
            outputs=["code or config changes", "touched file summary"],
            validation=["Changes stay inside approved paths", "No unrelated refactor"],
            dependencies=["T1"],
        ),
        ManagedTask(
            task_id="T3",
            title="Run verification",
            summary="Tester runs focused checks for the changed slice and reports pass/fail with evidence.",
            status="planned",
            owner="Tester",
            inputs=["implementation diff", "acceptance checklist"],
            outputs=["verification notes"],
            validation=["Every acceptance item is checked", "Failures are actionable"],
            dependencies=["T2"],
        ),
        ManagedTask(
            task_id="T4",
            title="Sync task records",
            summary="Documenter updates task records to match the actual completed slice.",
            status="planned",
            owner="Documenter",
            inputs=["verification notes", "touched files"],
            outputs=["tasklist/doc update proposal"],
            validation=["Status matches reality", "Docs do not overclaim"],
            dependencies=["T3"],
        ),
    ]

    manager_notes = [
        "Always start from one shared task entry instead of a free-form chat request.",
        "Do not assign implementation before scope, allowed files, and validation are explicit.",
        "Prefer one active slice at a time; split oversized work before execution.",
        "Treat CrewAI as an outer coordination layer, not a replacement for repo business logic.",
        f"Current objective: {normalized}",
    ]

    return WorkflowPlan(
        objective=normalized,
        manager_notes=manager_notes,
        roles=DEFAULT_ROLES,
        tasks=tasks,
        generated_at=datetime.now(UTC).isoformat(),
    )


def render_markdown(plan: WorkflowPlan) -> str:
    lines = [
        "# Local Multi-Agent Workflow Plan",
        "",
        f"## Objective\n{plan.objective}",
        "",
        "## Manager Notes",
    ]
    lines.extend(f"- {note}" for note in plan.manager_notes)
    lines.append("")
    lines.append("## Roles")
    lines.append("")
    for role in plan.roles:
        lines.append(f"### {role.name}")
        lines.append(f"- Goal: {role.goal}")
        lines.append(f"- Allowed paths: {', '.join(role.allowed_paths) if role.allowed_paths else '(none)'}")
        lines.append(f"- Deliverables: {', '.join(role.deliverables) if role.deliverables else '(none)'}")
        lines.append("")

    lines.append("## Task Flow")
    lines.append("")
    for task in plan.tasks:
        lines.append(f"### {task.task_id} · {task.title}")
        lines.append(f"- Owner: {task.owner}")
        lines.append(f"- Status: {task.status}")
        lines.append(f"- Summary: {task.summary}")
        lines.append(f"- Inputs: {', '.join(task.inputs) if task.inputs else '(none)'}")
        lines.append(f"- Outputs: {', '.join(task.outputs) if task.outputs else '(none)'}")
        lines.append(f"- Validation: {', '.join(task.validation) if task.validation else '(none)'}")
        lines.append(f"- Dependencies: {', '.join(task.dependencies) if task.dependencies else '(none)'}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def write_plan_files(objective: str, output_dir: str | Path) -> dict[str, str]:
    plan = build_initial_plan(objective)
    target_dir = Path(output_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    json_path = target_dir / "workflow-plan.json"
    md_path = target_dir / "workflow-plan.md"

    json_path.write_text(json.dumps(plan.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    md_path.write_text(render_markdown(plan), encoding="utf-8")

    return {
        "json": str(json_path),
        "markdown": str(md_path),
    }


try:
    from crewai import Agent, Crew, Process, Task  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    Agent = Crew = Process = Task = None


def crewai_available() -> bool:
    return all(item is not None for item in (Agent, Crew, Process, Task))


def build_crewai_stub(objective: str) -> dict[str, Any]:
    plan = build_initial_plan(objective)
    return {
        "available": crewai_available(),
        "objective": objective,
        "roles": [role.name for role in plan.roles],
        "task_ids": [task.task_id for task in plan.tasks],
        "note": (
            "CrewAI is importable; wire real LLM/backstory/tool configuration before executing live crews."
            if crewai_available()
            else "CrewAI is not installed yet; use the generated plan files as the manager-controlled workflow source of truth."
        ),
    }


def build_crewai_runtime_stub(objective: str) -> dict[str, Any]:
    plan = build_initial_plan(objective)
    return {
        "available": crewai_available(),
        "objective": objective,
        "process": "sequential",
        "agents": [
            {
                "role": role.name,
                "goal": role.goal,
                "allowed_paths": role.allowed_paths,
                "deliverables": role.deliverables,
            }
            for role in plan.roles
        ],
        "tasks": [
            {
                "task_id": task.task_id,
                "title": task.title,
                "owner": task.owner,
                "summary": task.summary,
                "inputs": task.inputs,
                "outputs": task.outputs,
                "validation": task.validation,
                "dependencies": task.dependencies,
            }
            for task in plan.tasks
        ],
        "live_ready": bool(os.environ.get("OPENAI_API_KEY") or os.environ.get("MODEL")),
        "note": (
            "CrewAI runtime classes are importable; this stub can be upgraded to a live crew once a model provider is configured."
            if crewai_available()
            else "CrewAI runtime classes are unavailable; install dependencies first."
        ),
    }


def run_managed_workflow(objective: str, live: bool = False) -> WorkflowRunResult:
    plan = build_initial_plan(objective)
    runtime_stub = build_crewai_runtime_stub(objective)
    execution_order = [task.task_id for task in plan.tasks]

    if live:
        if not crewai_available():
            raise RuntimeError("CrewAI is not importable in the current environment.")
        if not (os.environ.get("OPENAI_API_KEY") or os.environ.get("MODEL")):
            raise RuntimeError("Live CrewAI execution requires OPENAI_API_KEY or MODEL to be configured.")

    mode = "live" if live else "stub"
    crew_summary = {
        "status": "ready_for_live_execution" if live else "stub_runtime_ready",
        "available": runtime_stub["available"],
        "process": runtime_stub["process"],
        "agent_count": len(runtime_stub["agents"]),
        "task_count": len(runtime_stub["tasks"]),
        "live_ready": runtime_stub["live_ready"],
    }

    return WorkflowRunResult(
        objective=objective,
        mode=mode,
        crewai_available=crewai_available(),
        plan=plan.to_dict(),
        execution_order=execution_order,
        crew_summary=crew_summary,
        generated_at=datetime.now(UTC).isoformat(),
    )
