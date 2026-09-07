import 'package:flutter/material.dart';

// 모던 헬스 대시보드 스타일: 옅은 블루 그라데이션 바탕, 흰색 둥근 카드, 부드러운 그림자,
// 컬러 스탯 카드, 어두운 알약형 하단 내비, 선명한 파란 액센트.
class Lm {
  static const bg = Color(0xFFF3F5FA);
  static const headerGrad1 = Color(0xFFE7EEFB);
  static const headerGrad2 = Color(0xFFF3F5FA);

  static const primary = Color(0xFF2E6BFF);
  static const primaryDark = Color(0xFF1E52D8);

  static const text = Color(0xFF14161C);
  static const muted = Color(0xFF8A90A2);
  static const card = Colors.white;
  static const line = Color(0xFFECEEF3);

  static const good = Color(0xFF2E9E5B);
  static const goodBg = Color(0xFFDDF3E5);
  static const warnBg = Color(0xFFFFE9DC);
  static const warnFg = Color(0xFFD9642A);

  // 스탯 카드 톤 (배경 tint / 아이콘·강조색)
  static const violetBg = Color(0xFFF0EAFF);
  static const violet = Color(0xFF7C5CFF);
  static const mintBg = Color(0xFFE1F5EA);
  static const mint = Color(0xFF2E9E5B);
  static const peachBg = Color(0xFFFFEEE0);
  static const peach = Color(0xFFF08A3C);
  static const skyBg = Color(0xFFE7EFFF);
  static const sky = Color(0xFF2E6BFF);

  static const dark = Color(0xFF14161C); // 하단 알약 내비

  // 구 팔레트 호환 별칭 — 기존 화면들이 참조하던 토큰을 새 색으로 매핑.
  static const accent = primary;
  static const accent100 = skyBg;
  static const accent400 = Color(0xFF9EC0FF);
  static const accent700 = primaryDark;
  static const accent900 = text;
  static const divider = line;
  static const surface = Color(0xFFEFF1F6);

  static const radius = 22.0;
  static const cardShadow = [
    BoxShadow(color: Color(0x0F1A2340), blurRadius: 22, offset: Offset(0, 10)),
  ];
}

ThemeData buildTheme() {
  final base = ThemeData(useMaterial3: true, brightness: Brightness.light);
  return base.copyWith(
    scaffoldBackgroundColor: Lm.bg,
    colorScheme: base.colorScheme.copyWith(
      primary: Lm.primary,
      surface: Lm.bg,
      onPrimary: Colors.white,
      onSurface: Lm.text,
    ),
    textTheme: base.textTheme.apply(bodyColor: Lm.text, displayColor: Lm.text),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      hintStyle: const TextStyle(color: Lm.muted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Lm.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Lm.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Lm.primary, width: 1.6),
      ),
      labelStyle: const TextStyle(color: Lm.muted, fontSize: 13),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: Lm.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Lm.text,
        minimumSize: const Size.fromHeight(48),
        side: const BorderSide(color: Lm.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        backgroundColor: Colors.white,
      ),
    ),
  );
}

// 흰색 둥근 카드 (부드러운 그림자). 기존 화면들이 쓰던 Blueprint를 이 룩으로 대체한다.
class Panel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  const Panel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? Lm.card,
        borderRadius: BorderRadius.circular(Lm.radius),
        boxShadow: Lm.cardShadow,
      ),
      child: child,
    );
  }
}

// 하위 호환: 기존 코드의 Blueprint/Corners 참조가 그대로 컴파일되도록 유지하되 새 룩으로 렌더.
class Blueprint extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? background;
  const Blueprint({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.background,
  });

  @override
  Widget build(BuildContext context) =>
      Panel(padding: padding, color: background ?? Lm.card, child: child);
}

class Corners extends StatelessWidget {
  const Corners({super.key});
  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
