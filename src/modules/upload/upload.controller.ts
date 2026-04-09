import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { UploadJobResponseDto } from './dto/upload.dto';

// ─────────────────────────────────────────────────────────────────────────────
// upload.controller.ts
//
// Single endpoint: POST /upload/csv
//
// Accepts multipart/form-data with a CSV file.
// Passes the buffer to UploadService which streams it through csv-parse,
// validates rows, saves to MongoDB, and enqueues for ML scoring.
//
// File constraints (enforced by Multer):
//  • Max size: 10 MB
//  • MIME type: text/csv or text/plain (some browsers send text/plain for .csv)
//
// Interview talking point:
//  "I use memoryStorage so the file lives in RAM as a Buffer and goes
//   straight to the stream parser. I cap it at 10 MB to protect the server.
//   For files larger than that I'd switch to multer-s3 to stream directly
//   to S3 without touching the server's memory."
// ─────────────────────────────────────────────────────────────────────────────

const MB = 1024 * 1024;

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post('csv')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * MB },
      fileFilter: (_req, file, cb) => {
        const allowed = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Invalid file type: ${file.mimetype}. Only CSV files allowed.`), false);
        }
      },
    }),
  )
  @ApiOperation({
    summary: 'Bulk upload UPI transactions from a CSV file',
    description:
      'Accepts a CSV file (max 10 MB), validates each row, saves to MongoDB, ' +
      'and enqueues every valid transaction for async ML risk scoring. ' +
      'Returns immediately with a job summary — scoring continues in the background.\n\n' +
      '**Required CSV columns:** txnId, senderId, receiverId, amount, deviceId, ' +
      'city, state, transactionTime\n\n' +
      '**Optional columns:** currency, ipAddress, deviceModel',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type:   'string',
          format: 'binary',
          description: 'CSV file (max 10 MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 202, description: 'Upload accepted', type: UploadJobResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file type, missing columns, or empty file' })
  @ApiResponse({ status: 413, description: 'File exceeds 10 MB limit' })
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadJobResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded. Attach a CSV as "file" in multipart form-data.');
    }

    this.logger.log(
      `CSV upload received – name: ${file.originalname}, size: ${(file.size / 1024).toFixed(1)} KB`,
    );

    return this.uploadService.processUpload(file.buffer, file.originalname);
  }
}