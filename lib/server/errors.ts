export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function conflict(message = "Registro alterado. Atualize os dados e tente novamente."): never {
  throw new ApiError(409, message)
}
