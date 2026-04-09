import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─────────────────────────────────────────────────────────────────────────────
// upload.dto.ts
//
// Response shapes for the CSV bulk upload endpoint.
// The inbound payload is a multipart/form-data file – no DTO needed for that,
// Multer handles it.  These are the *response* shapes.
// ─────────────────────────────────────────────────────────────────────────────

export class UploadJobResponseDto {
  @ApiProperty({ example: 'job-uuid-1234' })
  jobId: string;

  @ApiProperty({ example: 150 })
  totalRows: number;

  @ApiProperty({ example: 148 })
  accepted: number;

  @ApiProperty({ example: 2 })
  rejected: number;

  @ApiProperty({
    example: ['Row 3: invalid VPA format', 'Row 91: amount must be positive'],
  })
  errors: string[];

  @ApiProperty({ example: 'PROCESSING' })
  status: string;

  @ApiProperty({ example: '2024-04-09T10:00:00Z' })
  startedAt: string;
}

export class UploadJobStatusDto {
  @ApiProperty({ example: 'job-uuid-1234' })
  jobId: string;

  @ApiProperty({ example: 'COMPLETED', enum: ['PROCESSING', 'COMPLETED', 'FAILED'] })
  status: string;

  @ApiProperty({ example: 150 })
  totalRows: number;

  @ApiProperty({ example: 148 })
  processed: number;

  @ApiProperty({ example: 2 })
  failed: number;

  @ApiPropertyOptional({ example: '2024-04-09T10:01:30Z' })
  completedAt?: string;

  @ApiPropertyOptional({
    example: ['Row 3: invalid VPA format'],
  })
  errors?: string[];
}