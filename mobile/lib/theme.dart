import 'package:flutter/material.dart';

// Industry 디자인 시스템(_ds/industry-*)의 토큰을 Flutter로 옮긴 값.
// 스틸 블루 액센트, 오프화이트 바탕, 사각 모서리(청사진) 스타일.
class Lm {
  static const bg = Color(0xFFF2F2F3);
  static const surface = Color(0xFFE9E9EA);
  static const text = Color(0xFF1D1F20);
  static const accent = Color(0xFF5980A6);
  static const accent100 = Color(0xFFEEF6FF);
  static const accent400 = Color(0xFF94BCE3);
  static const accent700 = Color(0xFF416180);
  static const accent900 = Color(0xFF1D2D3D);
  static const divider = Color(0x291D1F20); // text 16%
  static const muted = Color(0x8C1D1F20); // text 55%
}

ThemeData buildTheme() {
  final base = ThemeData(useMaterial3: true, brightness: Brightness.light);
  return base.copyWith(
    scaffoldBackgroundColor: Lm.bg,
    colorScheme: base.colorScheme.copyWith(
      primary: Lm.accent,
      surface: Lm.bg,
      onPrimary: Lm.bg,
      onSurface: Lm.text,
    ),
    textTheme: base.textTheme.apply(bodyColor: Lm.text, displayColor: Lm.text),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Lm.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: const OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide(color: Lm.divider),
      ),
      enabledBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide(color: Lm.divider),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide(color: Lm.accent, width: 1.5),
      ),
      labelStyle: const TextStyle(color: Lm.muted, fontSize: 13),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: Lm.accent,
        foregroundColor: Lm.bg,
        elevation: 0,
        minimumSize: const Size.fromHeight(48),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Lm.text,
        minimumSize: const Size.fromHeight(46),
        side: const BorderSide(color: Lm.divider),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      ),
    ),
  );
}

// 청사진 프레임 — 사각 테두리 + 네 모서리 등록 마크.
class Blueprint extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? background;
  const Blueprint({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.background});

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: double.infinity,
          padding: padding,
          decoration: BoxDecoration(
            color: background ?? Colors.transparent,
            border: Border.all(color: Lm.divider),
          ),
          child: child,
        ),
        ..._marks(),
      ],
    );
  }

  List<Widget> _marks() {
    const s = 9.0;
    Widget mark() => SizedBox(
          width: s,
          height: s,
          child: CustomPaint(painter: _CrossPainter()),
        );
    return [
      Positioned(left: -s / 2, top: -s / 2, child: mark()),
      Positioned(right: -s / 2, top: -s / 2, child: mark()),
      Positioned(left: -s / 2, bottom: -s / 2, child: mark()),
      Positioned(right: -s / 2, bottom: -s / 2, child: mark()),
    ];
  }
}

class _CrossPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = const Color(0x8C1D1F20)
      ..strokeWidth = 1;
    canvas.drawLine(Offset(size.width / 2, 0), Offset(size.width / 2, size.height), p);
    canvas.drawLine(Offset(0, size.height / 2), Offset(size.width, size.height / 2), p);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
