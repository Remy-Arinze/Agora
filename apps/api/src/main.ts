import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Global exception filter for better error messages
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe with strict transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('Agora API')
    .setDescription(
      'Multi-Tenant Digital Education Identity Platform - Chain-of-Trust Registry'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('onboarding', 'Student onboarding and bulk import')
    .addTag('students', 'Student management')
    .addTag('schools', 'School/tenant management')
    .addTag('transfers', 'Student transfer requests')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Expose swagger JSON for codegen
  app.getHttpAdapter().get('/swagger-json', (req, res) => {
    res.json(document);
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Agora API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/swagger`);
  console.log(`📦 Swagger JSON at http://localhost:${port}/api/swagger-json`);
}

bootstrap();

