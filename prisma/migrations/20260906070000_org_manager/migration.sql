-- 소속 기관의 직원 계정을 관리할 수 있는 권한. 역할과 직교하므로 별도 역할이 아니라 플래그로 둔다.
ALTER TABLE "User" ADD COLUMN "isOrgManager" BOOLEAN NOT NULL DEFAULT false;
