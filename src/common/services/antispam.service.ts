import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SpamCheckResult {
  isSpam: boolean;
  reasons: string[];
  score: number;
}

interface SubmissionRecord {
  ip: string;
  email: string;
  timestamp: number;
  count: number;
}

@Injectable()
export class AntiSpamService {
  private readonly logger = new Logger(AntiSpamService.name);
  private submissionHistory: Map<string, SubmissionRecord[]> = new Map();
  private readonly MAX_SUBMISSIONS_PER_HOUR = 3;
  private readonly MAX_SUBMISSIONS_PER_DAY = 10;
  private readonly HONEYPOT_FIELDS = ['website', 'url', 'homepage'];

  constructor(private configService: ConfigService) {}

  async checkForSpam(data: any, ip: string): Promise<SpamCheckResult> {
    const result: SpamCheckResult = {
      isSpam: false,
      reasons: [],
      score: 0,
    };

    // 1. Rate limiting check
    this.checkRateLimit(ip, data.email, result);

    // 2. Honeypot field check
    this.checkHoneypotFields(data, result);

    // 3. Content quality check
    this.checkContentQuality(data, result);

    // 4. Email validation
    this.checkEmailQuality(data.email, result);

    // 5. Phone validation
    this.checkPhoneQuality(data.phone, result);

    // 6. Suspicious patterns
    this.checkSuspiciousPatterns(data, result);

    // 7. Time-based checks
    this.checkTimingPatterns(result);

    // Determine if it's spam based on score
    result.isSpam = result.score >= 70;

    if (result.isSpam) {
      this.logger.warn(`Spam detected from IP ${ip}:`, {
        score: result.score,
        reasons: result.reasons,
        email: data.email,
      });
    }

    // Record this submission
    this.recordSubmission(ip, data.email);

    return result;
  }

  private checkRateLimit(ip: string, email: string, result: SpamCheckResult) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Check IP-based rate limiting
    const ipHistory = this.submissionHistory.get(`ip:${ip}`) || [];
    const recentIPSubmissions = ipHistory.filter(
      (record) => now - record.timestamp < oneHour,
    );

    if (recentIPSubmissions.length >= this.MAX_SUBMISSIONS_PER_HOUR) {
      result.score += 50;
      result.reasons.push('Too many submissions from IP in past hour');
    }

    const dailyIPSubmissions = ipHistory.filter(
      (record) => now - record.timestamp < oneDay,
    );

    if (dailyIPSubmissions.length >= this.MAX_SUBMISSIONS_PER_DAY) {
      result.score += 40;
      result.reasons.push('Too many submissions from IP in past day');
    }

    // Check email-based rate limiting
    if (email) {
      const emailHistory = this.submissionHistory.get(`email:${email}`) || [];
      const recentEmailSubmissions = emailHistory.filter(
        (record) => now - record.timestamp < oneHour,
      );

      if (recentEmailSubmissions.length >= 2) {
        result.score += 30;
        result.reasons.push('Too many submissions from email in past hour');
      }
    }
  }

  private checkHoneypotFields(data: any, result: SpamCheckResult) {
    for (const field of this.HONEYPOT_FIELDS) {
      if (data[field] && data[field].trim() !== '') {
        result.score += 100; // Instant spam if honeypot is filled
        result.reasons.push(`Honeypot field '${field}' was filled`);
      }
    }
  }

  private checkContentQuality(data: any, result: SpamCheckResult) {
    const message = data.message || data.comments || '';

    if (message.length < 10) {
      result.score += 20;
      result.reasons.push('Message too short');
    }

    if (message.length > 2000) {
      result.score += 15;
      result.reasons.push('Message unusually long');
    }

    // Check for common spam patterns
    const spamPatterns = [
      /\b(buy|cheap|discount|offer|deal|sale|price|money|cash|loan|credit)\b/gi,
      /\b(click|visit|check|see|view|watch|download|install)\b.*\b(here|now|today)\b/gi,
      /(https?:\/\/[^\s]+)/gi, // URLs
      /\b(\w+\.(?:com|net|org|info|biz|us|uk|ru|cn))\b/gi, // Domain names
      /[A-Z]{5,}/g, // All caps words
      /(.)\1{4,}/g, // Repeated characters
    ];

    let patternMatches = 0;
    for (const pattern of spamPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        patternMatches += matches.length;
      }
    }

    if (patternMatches > 3) {
      result.score += 25;
      result.reasons.push('Contains spam-like patterns');
    }

    // Check for excessive punctuation
    const punctuationCount = (message.match(/[!?]{2,}/g) || []).length;
    if (punctuationCount > 2) {
      result.score += 15;
      result.reasons.push('Excessive punctuation');
    }
  }

  private checkEmailQuality(email: string, result: SpamCheckResult) {
    if (!email) return;

    // Check for suspicious email patterns
    const suspiciousEmailPatterns = [
      /^\w+\d+@/, // Email starts with word followed by numbers
      /^[a-z]+[0-9]{4,}@/, // Email with 4+ consecutive numbers
      /\+.*@/, // Plus addressing (could be legitimate but suspicious in bulk)
      /@(tempmail|10minutemail|guerrillamail|mailinator|throwaway)/i, // Temporary email services
    ];

    for (const pattern of suspiciousEmailPatterns) {
      if (pattern.test(email)) {
        result.score += 20;
        result.reasons.push('Suspicious email pattern');
        break;
      }
    }

    // Check for common spam domains
    const spamDomains = [
      'example.com',
      'test.com',
      'fake.com',
      'spam.com',
      'bot.com',
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && spamDomains.includes(domain)) {
      result.score += 40;
      result.reasons.push('Known spam email domain');
    }

    // Check for very long email addresses (potential abuse)
    if (email.length > 50) {
      result.score += 10;
      result.reasons.push('Unusually long email address');
    }
  }

  private checkPhoneQuality(phone: string, result: SpamCheckResult) {
    if (!phone) return;

    // Remove all non-digit characters for analysis
    const digits = phone.replace(/\D/g, '');

    // Check for repeated digits
    if (/(\d)\1{6,}/.test(digits)) {
      result.score += 25;
      result.reasons.push('Phone contains too many repeated digits');
    }

    // Check for sequential numbers
    if (
      /012345|123456|234567|345678|456789|567890|678901|789012|890123|901234/.test(
        digits,
      )
    ) {
      result.score += 30;
      result.reasons.push('Phone contains sequential numbers');
    }

    // Check for obviously fake numbers
    const fakePatterns = [
      /^0{10,}$/, // All zeros
      /^1{10,}$/, // All ones
      /^(0000000000|1111111111|1234567890|0987654321)$/,
    ];

    for (const pattern of fakePatterns) {
      if (pattern.test(digits)) {
        result.score += 40;
        result.reasons.push('Obviously fake phone number');
        break;
      }
    }
  }

  private checkSuspiciousPatterns(data: any, result: SpamCheckResult) {
    // Check if name matches email (suspicious)
    if (data.name && data.email) {
      const nameWords = data.name.toLowerCase().split(/\s+/);
      const emailUser = data.email.split('@')[0].toLowerCase();

      if (
        nameWords.some(
          (word: string) => emailUser.includes(word) && word.length > 3,
        )
      ) {
        // This is actually common and legitimate, so low score
        result.score += 5;
      }
    }

    // Check for gibberish in name
    if (data.name) {
      const vowelRatio =
        (data.name.match(/[aeiou]/gi) || []).length / data.name.length;
      if (vowelRatio < 0.1 || vowelRatio > 0.8) {
        result.score += 15;
        result.reasons.push('Name appears to be gibberish');
      }
    }

    // Check for copy-paste signatures (all fields identical patterns)
    const fields = [data.name, data.email, data.phone, data.message];
    const nonEmptyFields = fields.filter((f) => f && f.trim());

    if (nonEmptyFields.length > 2) {
      const similarities = this.calculateFieldSimilarity(nonEmptyFields);
      if (similarities > 0.7) {
        result.score += 20;
        result.reasons.push('Fields show suspicious similarity patterns');
      }
    }
  }

  private checkTimingPatterns(result: SpamCheckResult) {
    // This is a placeholder for more sophisticated timing analysis
    // Could check if submission happens too quickly after page load
    // For now, we'll implement basic checks that can be expanded

    const now = new Date();
    const hour = now.getHours();

    // Slightly suspicious if submitted during typical spam hours (very late night)
    if (hour >= 2 && hour <= 5) {
      result.score += 5;
      result.reasons.push('Submitted during unusual hours');
    }
  }

  private calculateFieldSimilarity(fields: string[]): number {
    // Simple similarity check - could be made more sophisticated
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const similarity = this.stringSimilarity(fields[i], fields[j]);
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private recordSubmission(ip: string, email: string) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Record IP submission
    const ipKey = `ip:${ip}`;
    const ipHistory = this.submissionHistory.get(ipKey) || [];
    ipHistory.push({ ip, email, timestamp: now, count: 1 });

    // Keep only last 24 hours
    const filteredIPHistory = ipHistory.filter(
      (record) => now - record.timestamp < oneDay,
    );
    this.submissionHistory.set(ipKey, filteredIPHistory);

    // Record email submission
    if (email) {
      const emailKey = `email:${email}`;
      const emailHistory = this.submissionHistory.get(emailKey) || [];
      emailHistory.push({ ip, email, timestamp: now, count: 1 });

      // Keep only last 24 hours
      const filteredEmailHistory = emailHistory.filter(
        (record) => now - record.timestamp < oneDay,
      );
      this.submissionHistory.set(emailKey, filteredEmailHistory);
    }

    // Clean up old records periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      this.cleanupOldRecords();
    }
  }

  private cleanupOldRecords() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (const [key, records] of this.submissionHistory.entries()) {
      const filteredRecords = records.filter(
        (record) => now - record.timestamp < oneDay,
      );

      if (filteredRecords.length === 0) {
        this.submissionHistory.delete(key);
      } else {
        this.submissionHistory.set(key, filteredRecords);
      }
    }
  }

  // Method to verify Google reCAPTCHA if token is provided
  async verifyRecaptcha(token: string): Promise<boolean> {
    if (!token) return false;

    const secretKey = this.configService.get('RECAPTCHA_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('reCAPTCHA secret key not configured');
      return true; // Allow submission if reCAPTCHA is not configured
    }

    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `secret=${secretKey}&response=${token}`,
        },
      );

      const result = await response.json();
      return result.success && result.score > 0.5; // For reCAPTCHA v3
    } catch (error) {
      this.logger.error('reCAPTCHA verification failed:', error);
      return false;
    }
  }

  // Get submission statistics for monitoring
  getSpamStatistics(): any {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    let totalSubmissions = 0;
    let recentSubmissions = 0;
    const uniqueIPs = new Set<string>();
    const uniqueEmails = new Set<string>();

    for (const [key, records] of this.submissionHistory.entries()) {
      for (const record of records) {
        totalSubmissions++;

        if (now - record.timestamp < oneHour) {
          recentSubmissions++;
        }

        if (key.startsWith('ip:')) {
          uniqueIPs.add(record.ip);
        } else if (key.startsWith('email:')) {
          uniqueEmails.add(record.email);
        }
      }
    }

    return {
      totalSubmissions24h: totalSubmissions,
      recentSubmissions1h: recentSubmissions,
      uniqueIPs: uniqueIPs.size,
      uniqueEmails: uniqueEmails.size,
      averageSubmissionsPerIP:
        uniqueIPs.size > 0 ? totalSubmissions / uniqueIPs.size : 0,
    };
  }
}
