import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

// 역할별 "전용 단말" APK 엔트리 — 클라우드 웹 화면을 전체화면 WebView로 감싼다.
// 빌드 시 SURFACE로 어떤 역할 화면을 열지 지정한다.
//   flutter build apk -t lib/main_terminal.dart --dart-define=SURFACE=kiosk
//   (kiosk=무인 자판기, partner=매장 직원 POS, field=경찰 현장, console=관세청/운영자)
const _surface = String.fromEnvironment('SURFACE', defaultValue: 'kiosk');
const _base = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'https://app-production-daca.up.railway.app',
);

const _routes = {
  'kiosk': '/kiosk',
  'partner': '/partner',
  'field': '/field',
  'console': '/console',
  'dev': '/dev',
};

const _titles = {
  'kiosk': 'LEDGERMARK 자판기',
  'partner': 'LEDGERMARK 매장',
  'field': 'LEDGERMARK 현장단속',
  'console': 'LEDGERMARK 콘솔',
  'dev': 'LEDGERMARK 개발자',
};

void main() => runApp(const TerminalApp());

class TerminalApp extends StatelessWidget {
  const TerminalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: _titles[_surface] ?? 'LEDGERMARK',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true, scaffoldBackgroundColor: const Color(0xFF0E1116)),
      home: const TerminalScreen(),
    );
  }
}

class TerminalScreen extends StatefulWidget {
  const TerminalScreen({super.key});

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  late final WebViewController _controller;
  bool _loading = true;

  String get _url => '$_base${_routes[_surface] ?? '/'}';

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0E1116))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (_) => setState(() => _loading = false),
        ),
      )
      ..loadRequest(Uri.parse(_url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_loading)
              const Center(child: CircularProgressIndicator(color: Color(0xFF4C8DFF))),
          ],
        ),
      ),
    );
  }
}
