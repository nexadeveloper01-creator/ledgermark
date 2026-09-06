-- 관리자가 만든 계정과 자가 가입 계정을 감사 로그에서 구분한다.
ALTER TYPE "AuditAction" ADD VALUE 'USER_SIGNUP';
