import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'i18n.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await i18n.load();
  runApp(const LedgermarkApp());
}

class LedgermarkApp extends StatelessWidget {
  const LedgermarkApp({super.key});

  @override
  Widget build(BuildContext context) {
    // 언어가 바뀌면 앱 전체를 다시 그린다(설정에서 전환 시 즉시 반영).
    return ListenableBuilder(
      listenable: i18n,
      builder: (context, _) => MaterialApp(
        title: 'LEDGERMARK',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        locale: i18n.localeOverride,
        supportedLocales: const [Locale('en'), Locale('ko')],
        home: const AuthGate(),
      ),
    );
  }
}

// 저장된 토큰으로 세션을 복원하고, 성인 확인 뒤 소비자면 홈으로 보낸다.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  Map<String, dynamic>? _user;
  bool _loading = true;
  bool _ageOk = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    _ageOk = prefs.getBool('lm_age_ok') ?? false;
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

  Future<void> _confirmAge() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('lm_age_ok', true);
    if (mounted) setState(() => _ageOk = true);
  }

  void _onLoggedIn(Map<String, dynamic> user) => setState(() => _user = user);

  Future<void> _onLogout() async {
    await api.logout();
    if (mounted) setState(() => _user = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: Lm.primary)));
    }

    // 스토어 정책: 니코틴 관련 서비스는 성인 확인이 선행돼야 한다.
    if (!_ageOk) {
      return _AgeGate(onConfirm: _confirmAge);
    }

    final user = _user;
    if (user == null) {
      return LoginScreen(onLoggedIn: _onLoggedIn);
    }
    if (user['role'] != 'CONSUMER') {
      return _WrongRole(user: user, onLogout: _onLogout);
    }
    return HomeScreen(user: user, onLogout: _onLogout);
  }
}

// 만 20세 이상 성인 확인 게이트.
class _AgeGate extends StatelessWidget {
  final VoidCallback onConfirm;
  const _AgeGate({required this.onConfirm});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Lm.dark,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.verified_user_rounded, color: Colors.white, size: 44),
              const SizedBox(height: 18),
              Text(tr('age.title'),
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              Text(tr('age.body'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 15, height: 1.6)),
              const SizedBox(height: 24),
              SizedBox(
                width: 260,
                child: FilledButton(
                  onPressed: onConfirm,
                  style: FilledButton.styleFrom(
                    backgroundColor: Lm.primary,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(tr('age.yes')),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: 260,
                child: TextButton(
                  onPressed: () => showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      content: Text(tr('age.blocked')),
                      actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr('common.close')))],
                    ),
                  ),
                  child: Text(tr('age.no'), style: const TextStyle(color: Colors.white54)),
                ),
              ),
              const SizedBox(height: 18),
              Text(tr('age.notice'), style: const TextStyle(color: Colors.white38, fontSize: 11)),
            ],
          ),
        ),
      ),
    );
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
              const Text('This app is for consumers only.',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text('${user['email']}', style: const TextStyle(color: Lm.muted)),
              const SizedBox(height: 20),
              OutlinedButton(onPressed: onLogout, child: Text(tr('home.logout'))),
            ],
          ),
        ),
      ),
    );
  }
}
