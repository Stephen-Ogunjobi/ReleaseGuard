export class DomainRecordNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} was not found`);
    this.name = "DomainRecordNotFoundError";
  }
}

export class InvalidAttemptTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Attempt cannot transition from ${from} to ${to}`);
    this.name = "InvalidAttemptTransitionError";
  }
}

export class TerminalAttemptError extends Error {
  constructor(id: string, status: string) {
    super(`Attempt ${id} is terminal in status ${status} and cannot be changed`);
    this.name = "TerminalAttemptError";
  }
}

export class NoActiveCheckDefinitionsError extends Error {
  constructor(projectId: string) {
    super(`Project ${projectId} has no active check definitions`);
    this.name = "NoActiveCheckDefinitionsError";
  }
}

export class ActiveCheckDefinitionWithoutVersionError extends Error {
  constructor(checkDefinitionId: string) {
    super(`Active CheckDefinition ${checkDefinitionId} has no CheckVersion`);
    this.name = "ActiveCheckDefinitionWithoutVersionError";
  }
}
