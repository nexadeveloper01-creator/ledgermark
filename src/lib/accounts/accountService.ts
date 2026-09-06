import { randomBytes } from "crypto";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import {
  AccountPolicyError,
  assertCanDisable,
  isStaffRole,
  validateCreateUser,
  type CreateUserInput,
} from "./policy";

// 관리자가 약한 비밀번호를 직접 입력하지 않도록 시스템이 임시 비밀번호를 생성한다.
// 생성 직후 한 번만 화면에 노출되고 저장되지 않는다.
export function generateTempPassword(): string {
  return randomBytes(12).toString("base64url");
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      disabledAt: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
      consumerId: true,
      _count: { select: { sessions: true } },
    },
  });
}

export async function createUser(input: CreateUserInput) {
  const valid = validateCreateUser(input);

  const existing = await prisma.user.findUnique({ where: { email: valid.email } });
  if (existing) {
    throw new AccountPolicyError("이미 사용 중인 이메일입니다.");
  }

  if (valid.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: valid.organizationId } });
    if (!org) throw new AccountPolicyError("존재하지 않는 기관입니다.");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.$transaction(async (tx) => {
    // 소비자 계정은 원장 소유권 주체인 Consumer 레코드와 함께 만들어져야 한다.
    const consumerId = isStaffRole(valid.role)
      ? null
      : (await tx.consumer.create({
          data: { displayName: valid.displayName, country: valid.country },
        })).id;

    return tx.user.create({
      data: {
        email: valid.email,
        displayName: valid.displayName,
        role: valid.role,
        organizationId: valid.organizationId,
        consumerId,
        passwordHash,
      },
      select: { id: true, email: true, displayName: true, role: true },
    });
  });

  return { user, tempPassword };
}

export async function resetPassword(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AccountPolicyError("계정을 찾을 수 없습니다.");

  const tempPassword = generateTempPassword();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(tempPassword) },
    }),
    // 비밀번호가 바뀌면 기존 세션은 무효화한다.
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  return { tempPassword };
}

export async function setDisabled(args: {
  targetUserId: string;
  actorUserId: string;
  disabled: boolean;
}) {
  const target = await prisma.user.findUnique({ where: { id: args.targetUserId } });
  if (!target) throw new AccountPolicyError("계정을 찾을 수 없습니다.");

  if (args.disabled) {
    const otherActiveAdminCount = await prisma.user.count({
      where: { role: "ADMIN", disabledAt: null, id: { not: target.id } },
    });

    assertCanDisable({
      targetUserId: target.id,
      targetRole: target.role,
      targetAlreadyDisabled: target.disabledAt !== null,
      actorUserId: args.actorUserId,
      otherActiveAdminCount,
    });

    // 비활성화는 기존 세션까지 끊어야 실제로 접근이 차단된다.
    await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { disabledAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: target.id } }),
    ]);
    return { disabled: true };
  }

  await prisma.user.update({ where: { id: target.id }, data: { disabledAt: null } });
  return { disabled: false };
}

export async function revokeSessions(userId: string) {
  const result = await prisma.session.deleteMany({ where: { userId } });
  return { revoked: result.count };
}
