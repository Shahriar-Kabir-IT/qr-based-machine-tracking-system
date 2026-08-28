import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionFilter, Catch, NotFoundException, ArgumentsHost, HttpException } from '@nestjs/common';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
const indexFile = path.join(distPath, 'index.html');

@Catch(NotFoundException)
class SpaFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    if (req.url.startsWith('/api/')) {
      res.status(404).json({ statusCode: 404, message: 'Not Found' });
    } else {
      res.sendFile(indexFile);
    }
  }
}

async function bootstrap() {
  const certPath = path.join(__dirname, '..', 'certs');
  const keyFile = path.join(certPath, 'key.pem');
  const certFile = path.join(certPath, 'cert.pem');

  let httpsOptions: any = undefined;
  if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    httpsOptions = { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
    console.log('SSL enabled');
  }

  const app = await NestFactory.create(AppModule, httpsOptions ? { httpsOptions } : {});
  app.enableCors({ origin: true, credentials: true });
  app.use(express.static(distPath));
  app.useGlobalFilters(new SpaFilter());
  await app.listen(process.env.PORT ?? 5173, '0.0.0.0');
}
bootstrap();
