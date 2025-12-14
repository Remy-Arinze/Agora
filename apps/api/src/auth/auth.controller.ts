import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, VerifyOtpDto, AuthTokensDto } from './dto/login.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
import { ResponseDto } from '../common/dto/response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/phone and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: ResponseDto<AuthTokensDto>,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<ResponseDto<AuthTokensDto>> {
    try {
      const data = await this.authService.login(loginDto);
      return ResponseDto.ok(data, 'Login successful');
    } catch (error) {
      // Log the error for debugging
      console.error('Login error:', error);
      // Re-throw to let NestJS handle it with proper status codes
      throw error;
    }
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and activate shadow parent account' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified and account activated',
    type: ResponseDto<AuthTokensDto>,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto
  ): Promise<ResponseDto<AuthTokensDto>> {
    const data = await this.authService.verifyOtp(verifyOtpDto);
    return ResponseDto.ok(data, 'Account activated successfully');
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if user exists',
  })
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto
  ): Promise<ResponseDto<void>> {
    await this.authService.requestPasswordReset(requestPasswordResetDto);
    return ResponseDto.ok(null, 'If an account exists with this email, a password reset link has been sent');
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto
  ): Promise<ResponseDto<void>> {
    await this.authService.resetPassword(resetPasswordDto);
    return ResponseDto.ok(null, 'Password reset successfully');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'JWT refresh token',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: ResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() body: { refreshToken: string }): Promise<ResponseDto<{ accessToken: string; refreshToken: string }>> {
    const data = await this.authService.refreshToken(body.refreshToken);
    return ResponseDto.ok(data, 'Token refreshed successfully');
  }
}

