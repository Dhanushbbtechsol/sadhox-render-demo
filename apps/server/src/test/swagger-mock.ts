/** Jest stub — Nest Swagger is ESM-only and breaks CommonJS Jest. */
function noopDecorator(): ClassDecorator & MethodDecorator & PropertyDecorator {
  return (() => undefined) as ClassDecorator &
    MethodDecorator &
    PropertyDecorator;
}

export const ApiProperty = noopDecorator;
export const ApiPropertyOptional = noopDecorator;
export const ApiTags = noopDecorator;
export const ApiBearerAuth = noopDecorator;
export const ApiOperation = noopDecorator;
export const ApiBody = noopDecorator;
export const ApiResponse = noopDecorator;
export const ApiQuery = noopDecorator;
export const ApiParam = noopDecorator;
export const DocumentBuilder = class {
  setTitle() {
    return this;
  }
  setDescription() {
    return this;
  }
  setVersion() {
    return this;
  }
  addBearerAuth() {
    return this;
  }
  addCookieAuth() {
    return this;
  }
  build() {
    return {};
  }
};
export const SwaggerModule = {
  createDocument: () => ({}),
  setup: () => undefined,
};
