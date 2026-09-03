export class OwnerProvisioningError extends Error {}

export class OwnerEmailAlreadyExistsError extends OwnerProvisioningError {
  constructor() {
    super("O e-mail informado já existe. Nenhuma conta foi adotada ou sobrescrita.");
    this.name = "OwnerEmailAlreadyExistsError";
  }
}

export class OwnerMembershipAlreadyExistsError extends OwnerProvisioningError {
  constructor() {
    super("A membership já existe. O provisionamento foi cancelado sem sobrescrever registros.");
    this.name = "OwnerMembershipAlreadyExistsError";
  }
}

export class InvalidOwnerProvisioningInputError extends OwnerProvisioningError {
  constructor() {
    super("Informe e-mail válido, senha de 12–1024 caracteres e name/address/phone/timezone válidos do Restaurant.");
    this.name = "InvalidOwnerProvisioningInputError";
  }
}
