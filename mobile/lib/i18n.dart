import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

// 경량 다국어(한/영) 엔진. 기본은 기기 언어에 종속되며, 설정에서 한국어/English/시스템으로
// 바꾸면 SharedPreferences에 저장돼 유지된다. MaterialApp을 이 컨트롤러로 감싸 언어 변경 시
// 즉시 리빌드한다.
enum AppLang { system, ko, en }

class I18n extends ChangeNotifier {
  static const _key = 'lm_lang';
  AppLang _pref = AppLang.system;

  AppLang get pref => _pref;

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    switch (p.getString(_key)) {
      case 'ko':
        _pref = AppLang.ko;
        break;
      case 'en':
        _pref = AppLang.en;
        break;
      default:
        _pref = AppLang.system;
    }
    notifyListeners();
  }

  Future<void> setLang(AppLang lang) async {
    _pref = lang;
    final p = await SharedPreferences.getInstance();
    if (lang == AppLang.system) {
      await p.remove(_key);
    } else {
      await p.setString(_key, lang == AppLang.ko ? 'ko' : 'en');
    }
    notifyListeners();
  }

  // 설정 override가 있으면 그 언어, 없으면 기기 언어(ko면 한국어, 그 외 영어).
  String get code {
    if (_pref == AppLang.ko) return 'ko';
    if (_pref == AppLang.en) return 'en';
    final dev = PlatformDispatcher.instance.locale.languageCode;
    return dev == 'ko' ? 'ko' : 'en';
  }

  Locale? get localeOverride {
    if (_pref == AppLang.ko) return const Locale('ko');
    if (_pref == AppLang.en) return const Locale('en');
    return null; // 시스템
  }

  String t(String key) {
    final row = _strings[key];
    if (row == null) {
      assert(() {
        debugPrint('[i18n] 누락된 키: $key');
        return true;
      }());
      return key;
    }
    return row[code] ?? row['en'] ?? key;
  }

  // 파라미터 치환: t('x', {'n':'3'}) → "...{n}..." 안의 {n} 교체
  String tp(String key, Map<String, String> args) {
    var s = t(key);
    args.forEach((k, v) => s = s.replaceAll('{$k}', v));
    return s;
  }
}

final i18n = I18n();

// 편의 함수
String tr(String key) => i18n.t(key);
String trp(String key, Map<String, String> args) => i18n.tp(key, args);

// ── 문자열 테이블 ─────────────────────────────────────────────────────
const Map<String, Map<String, String>> _strings = {
  // 공통
  'app.name': {'ko': 'ConiaMark', 'en': 'ConiaMark'},
  'common.cancel': {'ko': '취소', 'en': 'Cancel'},
  'common.confirm': {'ko': '확인', 'en': 'Confirm'},
  'common.close': {'ko': '닫기', 'en': 'Close'},
  'common.retry': {'ko': '다시 시도', 'en': 'Retry'},
  'common.loading': {'ko': '불러오는 중...', 'en': 'Loading...'},
  'common.back': {'ko': '뒤로', 'en': 'Back'},
  'common.save': {'ko': '저장', 'en': 'Save'},

  // 로그인
  'login.title': {'ko': '로그인', 'en': 'Sign in'},
  'login.subtitle': {'ko': '소비자 계정으로 로그인하세요.', 'en': 'Sign in with your consumer account.'},
  'login.email': {'ko': '이메일', 'en': 'Email'},
  'login.password': {'ko': '비밀번호', 'en': 'Password'},
  'login.submit': {'ko': '로그인', 'en': 'Sign in'},
  'login.signup': {'ko': '소비자이신가요? 가입하기', 'en': 'New here? Create an account'},
  'login.name': {'ko': '이름', 'en': 'Name'},
  'login.toLogin': {'ko': '이미 계정이 있으신가요? 로그인', 'en': 'Already have an account? Sign in'},
  'login.signupSubmit': {'ko': '가입하기', 'en': 'Create account'},
  'login.failed': {'ko': '로그인에 실패했습니다.', 'en': 'Sign-in failed.'},

  // 하단 내비 / 홈
  'nav.home': {'ko': '홈', 'en': 'Home'},
  'nav.status': {'ko': '등록 상태', 'en': 'Status'},
  'nav.products': {'ko': '내 제품', 'en': 'Products'},
  'nav.rewards': {'ko': '혜택', 'en': 'Rewards'},
  'nav.scan': {'ko': '스캔', 'en': 'Scan'},
  'home.hello': {'ko': '안녕하세요 👋', 'en': 'Welcome 👋'},
  'home.logout': {'ko': '로그아웃', 'en': 'Sign out'},
  'verify.banner': {'ko': '이메일 인증 후 정품 등록을 신청할 수 있습니다.', 'en': 'Verify your email to register products.'},
  'verify.resend': {'ko': '인증 메일 다시 보내기', 'en': 'Resend verification email'},
  'verify.sent': {'ko': '인증 메일을 다시 보냈습니다.', 'en': 'Verification email sent again.'},
  'verify.resendFail': {'ko': '재발송에 실패했습니다.', 'en': 'Failed to resend.'},

  // 대시보드
  'dash.ownedGenuine': {'ko': '보유 정품', 'en': 'Genuine owned'},
  'dash.genuineBadge': {'ko': '정품 인증', 'en': 'Verified'},
  'dash.registeredCount': {'ko': '개 등록', 'en': 'registered'},
  'dash.overview': {'ko': '개요', 'en': 'Overview'},
  'dash.myPoints': {'ko': '내 포인트', 'en': 'My points'},
  'dash.checkinCta': {'ko': '출석하기', 'en': 'Check in'},
  'dash.weeks': {'ko': '주', 'en': 'wk'},
  'dash.statOwned': {'ko': '보유 제품', 'en': 'Products'},
  'dash.statVouchers': {'ko': '유효 교환권', 'en': 'Vouchers'},
  'dash.statPending': {'ko': '등록 대기', 'en': 'Pending'},
  'dash.statCommitted': {'ko': '등록 완료', 'en': 'Registered'},
  'dash.scanTitle': {'ko': '제품 정품 확인', 'en': 'Verify a product'},
  'dash.scanDesc': {'ko': 'QR·UID를 스캔해 정품을 등록하세요', 'en': 'Scan a QR/UID to register a genuine product'},

  // 혜택/포인트
  'rewards.myPoints': {'ko': '내 포인트', 'en': 'My points'},
  'rewards.streak': {'ko': '{n}주 연속 출석', 'en': '{n}-week streak'},
  'rewards.checkin': {'ko': '주간 출석', 'en': 'Weekly check-in'},
  'rewards.checkedIn': {'ko': '출석 완료', 'en': 'Checked in'},
  'rewards.checkinDone': {'ko': '출석 완료! +{p} P · {n}주 연속', 'en': 'Checked in! +{p} pts · {n}-week streak'},
  'rewards.earnTitle': {'ko': '포인트 쌓기', 'en': 'Earn points'},
  'rewards.earnDesc': {'ko': '설문에 참여하고 포인트를 받으세요', 'en': 'Answer surveys to earn points'},
  'rewards.useTitle': {'ko': '포인트 사용', 'en': 'Spend points'},
  'rewards.useDesc': {'ko': '경품 응모 · 콘텐츠 해금 · 할인', 'en': 'Prizes · unlocks · discounts'},
  'rewards.history': {'ko': '적립 내역', 'en': 'History'},
  'rewards.noHistory': {'ko': '아직 적립 내역이 없어요.', 'en': 'No activity yet.'},
  'rewards.done': {'ko': '완료', 'en': 'Done'},
  'rewards.redeem': {'ko': '신청', 'en': 'Redeem'},
  'rewards.soldOut': {'ko': '품절', 'en': 'Sold out'},
  'rewards.insufficient': {'ko': '부족', 'en': 'Low'},
  'rewards.redeemConfirm': {'ko': '{p} P를 사용해 신청하시겠어요?', 'en': 'Use {p} pts to redeem this?'},
  'rewards.use': {'ko': '사용', 'en': 'Use'},
  'rewards.redeemDone': {'ko': '신청 완료! 잔액 {b} P', 'en': 'Done! Balance {b} pts'},
  'rewards.surveyDone': {'ko': '설문 참여 완료! +{p} P', 'en': 'Survey complete! +{p} pts'},

  // 혜택 요약(동의/쿠폰)
  'benefits.title': {'ko': '개인정보 동의 & 혜택', 'en': 'Consent & benefits'},
  'benefits.manage': {'ko': '동의 관리', 'en': 'Manage consent'},
  'benefits.consentPts': {'ko': '동의로 받은 포인트', 'en': 'Consent points'},
  'benefits.coupons': {'ko': '보유 쿠폰', 'en': 'Coupons'},
  'benefits.discount': {'ko': '할인 혜택', 'en': 'Discounts'},
  'benefits.couponsUnit': {'ko': '장', 'en': ''},
  'coupons.title': {'ko': '내 쿠폰', 'en': 'My coupons'},
  'coupons.desc': {'ko': '포인트로 받은 할인 혜택', 'en': 'Discounts earned with points'},
  'coupons.usable': {'ko': '사용 가능', 'en': 'Available'},
  'coupons.used': {'ko': '사용완료', 'en': 'Used'},
  'coupons.expired': {'ko': '만료', 'en': 'Expired'},
  'coupons.showQr': {'ko': 'QR 제시', 'en': 'Show QR'},
  'coupons.qrTitle': {'ko': '매장 계산대에서 이 QR을 보여주세요', 'en': 'Show this QR at the store counter'},
  'coupons.qrNote': {'ko': '결제가 완료되면 자동으로 사용 처리됩니다.', 'en': 'It is marked used automatically at checkout.'},

  // 포인트 사유
  'reason.SIGNUP_BONUS': {'ko': '가입 축하', 'en': 'Signup bonus'},
  'reason.DEVICE_REGISTRATION': {'ko': '정품 등록', 'en': 'Product registration'},
  'reason.WEEKLY_CHECKIN': {'ko': '주간 출석', 'en': 'Weekly check-in'},
  'reason.STREAK_BONUS': {'ko': '연속 출석 보너스', 'en': 'Streak bonus'},
  'reason.SURVEY_COMPLETION': {'ko': '설문 참여', 'en': 'Survey'},
  'reason.PROFILE_COMPLETION': {'ko': '프로필 입력', 'en': 'Profile'},
  'reason.CONSENT_REWARD': {'ko': '개인정보 활용 동의', 'en': 'Data consent'},
  'reason.REWARD_REDEMPTION': {'ko': '리워드 사용', 'en': 'Redemption'},
  'reason.ADJUSTMENT': {'ko': '조정', 'en': 'Adjustment'},

  // 동의 화면
  'consent.title': {'ko': '개인정보 동의 & 혜택', 'en': 'Consent & benefits'},
  'consent.intro': {
    'ko': '동의하신 정보는 맞춤 혜택·제품 개선에만 활용되며, 그 대가로 포인트와 할인 혜택을 드립니다. 언제든 철회할 수 있어요.',
    'en': 'Consented data is used only for tailored benefits and product improvement, in exchange for points and discounts. You can withdraw anytime.'
  },
  'consent.save': {'ko': '동의 설정 저장', 'en': 'Save consent'},
  'consent.footnote': {'ko': '이미 보상을 받은 항목은 철회 후 재동의해도 다시 지급되지 않습니다.', 'en': 'Already-rewarded scopes are not paid again if re-granted.'},
  'consent.rewarded': {'ko': '보상 완료 · +{p} P', 'en': 'Rewarded · +{p} pts'},
  'consent.grantPts': {'ko': '동의 시 +{p} P', 'en': '+{p} pts on consent'},
  'consent.savedAwarded': {'ko': '동의 완료! +{p} P 적립', 'en': 'Saved! +{p} pts'},
  'consent.saved': {'ko': '동의 설정을 저장했습니다.', 'en': 'Consent settings saved.'},
  'scope.profile': {'ko': '프로필 정보(연령대·지역)', 'en': 'Profile (age band · region)'},
  'scope.usage': {'ko': '제품 사용 습관', 'en': 'Usage habits'},
  'scope.location': {'ko': '위치 기반', 'en': 'Location'},
  'scope.marketing': {'ko': '맞춤 광고·마케팅 활용', 'en': 'Personalized marketing'},

  // 제품/교환
  'products.title': {'ko': '내 제품', 'en': 'My products'},
  'products.desc': {'ko': '보유 중인 제품의 교환권 상태를 확인하고 교환·중고거래를 신청합니다.', 'en': 'Check voucher status and request exchange or resale.'},
  'products.none': {'ko': '보유한 제품이 없습니다.', 'en': 'No products yet.'},
  'products.exchange': {'ko': '교환 신청', 'en': 'Request exchange'},
  'products.resell': {'ko': '중고거래 등록', 'en': 'List for resale'},
  'products.voucher': {'ko': '교환권', 'en': 'Voucher'},
  'products.exchangeTitle': {'ko': '무상 교환 혜택', 'en': 'Free exchange'},
  'products.exchangeBase': {'ko': '기기당 최초 1회 무상 교환이 제공됩니다.', 'en': 'One free exchange per device.'},
  'products.bonusOpen': {'ko': '자격 충족! 추가 무상 교환 {n}회 사용 가능 — 교환권이 없는 기기에서 "추가 교환 활성화"를 누르세요.', 'en': 'Qualified! {n} extra free exchange available — tap "Activate extra exchange" on a device with no voucher.'},
  'products.bonusLocked': {'ko': '전체 설문 완료 + 정보 이용 동의 시 추가 1회 무상 교환이 열립니다.', 'en': 'Complete all surveys + consent to unlock one extra free exchange.'},
  'products.activateBonus': {'ko': '추가 무상 교환 활성화', 'en': 'Activate extra exchange'},
  'products.bonusDone': {'ko': '추가 무상 교환권이 활성화되었습니다. 이제 교환을 신청할 수 있어요.', 'en': 'Extra exchange activated. You can now request an exchange.'},
  'products.exchanged': {'ko': '교환 신청이 접수되었습니다. 매장 AS 검수 후 처리됩니다.', 'en': 'Exchange requested. It will be handled after store inspection.'},
  'products.resellAsk': {'ko': '양수인 이메일', 'en': "Buyer's email"},
  'products.resellTitle': {'ko': '중고거래 양수인', 'en': 'Resale recipient'},
  'products.resellCta': {'ko': '양도', 'en': 'Transfer'},

  // 스캔
  'scan.title': {'ko': 'UID 스캔', 'en': 'Scan UID'},
  'scan.desc': {'ko': '제품 하단 코드를 입력하면 원장에서 즉시 조회됩니다.', 'en': 'Enter the code under the product to verify against the ledger.'},
  'scan.uidCode': {'ko': 'UID 코드', 'en': 'UID code'},
  'scan.camera': {'ko': '카메라로 스캔', 'en': 'Scan with camera'},
  'scan.lookup': {'ko': '코드로 조회', 'en': 'Look up by code'},
  'scan.notFound': {'ko': '원장에 존재하지 않는 UID입니다. 위조품일 수 있습니다.', 'en': 'UID not on the ledger — it may be counterfeit.'},
  'scan.lookupFail': {'ko': '조회에 실패했습니다.', 'en': 'Lookup failed.'},
  'scan.genuine': {'ko': '원장 일치 · 정품 확인', 'en': 'On ledger · genuine'},
  'scan.checkStatus': {'ko': '원장 일치 · 상태 확인 필요', 'en': 'On ledger · check status'},
  'scan.product': {'ko': '제품', 'en': 'Product'},
  'scan.status': {'ko': '현재 상태', 'en': 'Status'},
  'scan.continue': {'ko': '연령인증으로', 'en': 'Continue to age check'},
  'scan.claimDone': {'ko': '{p} 정품 등록 완료! 소유권 이전 · +{pt} P', 'en': '{p} registered! Ownership transferred · +{pt} pts'},
  'scan.ageTitle': {'ko': '연령인증', 'en': 'Age verification'},
  'scan.ageDesc': {'ko': '정부발급 ID 스캔과 Liveness 검사를 수행합니다.', 'en': 'Government ID scan and liveness check.'},
  'scan.birth': {'ko': '생년월일 (YYYY-MM-DD)', 'en': 'Date of birth (YYYY-MM-DD)'},
  'scan.idScanned': {'ko': '정부발급 ID 스캔 완료', 'en': 'Government ID scanned'},
  'scan.liveness': {'ko': 'Liveness 검사 통과', 'en': 'Liveness passed'},
  'scan.verifyResult': {'ko': '검증 결과', 'en': 'Result'},
  'scan.pass': {'ko': '통과', 'en': 'Passed'},
  'scan.fail': {'ko': '실패', 'en': 'Failed'},
  'scan.needEmail': {'ko': '이메일 인증을 완료해야 정품 등록을 신청할 수 있습니다.', 'en': 'Verify your email before registering.'},
  'scan.register': {'ko': '정품 등록 신청', 'en': 'Register product'},
  'scan.verify': {'ko': '인증 완료', 'en': 'Verify'},
  'scan.backToScan': {'ko': '← 스캔으로 돌아가기', 'en': '← Back to scan'},

  // 설문
  'survey.submit': {'ko': '제출하고 {p} P 받기', 'en': 'Submit & get {p} pts'},
  'survey.freeText': {'ko': '자유롭게 입력해 주세요 (선택)', 'en': 'Optional free text'},

  // 상태 탭
  'status.title': {'ko': '등록 상태', 'en': 'Registration status'},
  'status.none': {'ko': '등록 신청 내역이 없습니다.', 'en': 'No registration requests yet.'},

  // 설정
  'settings.title': {'ko': '설정', 'en': 'Settings'},
  'settings.language': {'ko': '언어', 'en': 'Language'},
  'settings.langSystem': {'ko': '시스템 기본', 'en': 'System default'},
  'settings.langKo': {'ko': '한국어', 'en': 'Korean'},
  'settings.langEn': {'ko': 'English', 'en': 'English'},
  'settings.legal': {'ko': '약관 및 정책', 'en': 'Legal'},
  'settings.privacy': {'ko': '개인정보 처리방침', 'en': 'Privacy Policy'},
  'settings.terms': {'ko': '이용약관', 'en': 'Terms of Service'},
  'settings.account': {'ko': '계정', 'en': 'Account'},
  'settings.logout': {'ko': '로그아웃', 'en': 'Sign out'},
  'settings.deleteAccount': {'ko': '계정 삭제', 'en': 'Delete account'},
  'settings.deleteConfirmTitle': {'ko': '계정을 삭제할까요?', 'en': 'Delete your account?'},
  'settings.deleteConfirmBody': {
    'ko': '계정과 개인정보가 삭제됩니다. 보유 포인트·쿠폰은 사라지며 되돌릴 수 없습니다. 계속하려면 비밀번호를 입력하세요.',
    'en': 'Your account and personal data will be deleted. Points and coupons are lost and this cannot be undone. Enter your password to continue.'
  },
  'settings.deleteCta': {'ko': '영구 삭제', 'en': 'Delete permanently'},
  'settings.deleteDone': {'ko': '계정이 삭제되었습니다.', 'en': 'Your account has been deleted.'},
  'settings.deleteFail': {'ko': '삭제에 실패했습니다.', 'en': 'Deletion failed.'},
  'settings.version': {'ko': '버전', 'en': 'Version'},

  // 성인 게이트
  'age.title': {'ko': '성인 확인', 'en': 'Age verification'},
  'age.body': {
    'ko': '이 앱은 만 20세 이상 성인만 이용할 수 있습니다. 만 20세 이상이십니까?',
    'en': 'This app is for adults aged 20+ only. Are you 20 or older?'
  },
  'age.yes': {'ko': '네, 성인입니다', 'en': "Yes, I'm 20+"},
  'age.no': {'ko': '아니요', 'en': 'No'},
  'age.blocked': {'ko': '만 20세 이상만 이용할 수 있어 앱을 종료합니다.', 'en': 'This app is restricted to adults 20+.'},
  'age.notice': {'ko': '성인 대상 · 니코틴 함유 제품 관련 서비스', 'en': 'Adults only · relates to nicotine-containing products'},
};
