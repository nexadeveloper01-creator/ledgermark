import 'package:flutter/material.dart';
import 'api.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const LedgermarkApp());
}

class LedgermarkApp extends StatelessWidget {
  const LedgermarkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LEDGERMARK',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const AuthGate(),
    );
  }
}

// 저장된 토큰으로 세션을 복원하고, 소비자 계정이면 홈으로 보낸다.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  Map<String, dynamic>? _user;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    await api.loadToken();
    Map<String, dynamic>? user;
    if (api.isAuthenticated) {
      try {
        user = await api.me();
      } catch (_) {
        user = null;
      }
    }
    if (!mounted) return;
    setState(() {
      _user = user;
      _loading = false;
    });
  }

  void _onLoggedIn(Map<String, dynamic> user) => setState(() => _user = user);

  Future<void> _onLogout() async {
    await api.logout();
    if (mounted) setState(() => _user = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final user = _user;
    if (user == null) {
      return LoginScreen(onLoggedIn: _onLoggedIn);
    }

    // 이 앱은 소비자 전용이다. 다른 역할 계정은 안내만 하고 로그아웃하게 둔다.
    if (user['role'] != 'CONSUMER') {
      return _WrongRole(user: user, onLogout: _onLogout);
    }

    return HomeScreen(user: user, onLogout: _onLogout);
  }
}

class _WrongRole extends StatelessWidget {
  final Map<String, dynamic> user;
  final Future<void> Function() onLogout;
  const _WrongRole({required this.user, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('이 앱은 소비자 전용입니다.',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text('${user['email']} 계정은 소비자 계정이 아닙니다.',
                  style: const TextStyle(color: Lm.muted)),
              const SizedBox(height: 20),
              OutlinedButton(onPressed: onLogout, child: const Text('로그아웃')),
            ],
          ),
        ),
      ),
    );
  }
}
