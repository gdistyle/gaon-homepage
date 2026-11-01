// 통합 로그인 설정 — 공개 클라이언트 ID만 기록 (비밀키 없음)
// 회원 자료는 한 곳에 저장하고, 로그인 화면은 사이트별로 따로 보여 준다.
export const AUTH = {
  google: { clientId: "246757106508-pgh0mq9r6bddgamoegbp2aqa4sjm9jdv.apps.googleusercontent.com" },
  naver: { clientId: "HoC02w2banoY2fcr3Ot6" },
  // 카카오: 앱 등록 후 REST API 키를 넣으면 버튼이 켜짐
  kakao: { restKey: "", redirectUri: "https://gaonlab.gdistyle.workers.dev/login" },
  // 구글 로그인으로 받아 주는 앱(사이트별 클라이언트)
  googleClients: [
    "246757106508-pgh0mq9r6bddgamoegbp2aqa4sjm9jdv.apps.googleusercontent.com", // 가온연구소
    "640982456943-vfboefbl245o7dserpbjti7erav1kvqr.apps.googleusercontent.com", // AOM 건축 사전 검토
  ],
  // 카카오 사이트별 설정 { REST키: 돌아올 주소 }
  kakaoApps: {},
  // 이 서버를 부를 수 있는 사이트
  allowedOrigins: [
    "https://gaonlab.gdistyle.workers.dev",
    "https://aom-law-review.gdistyle.workers.dev",
  ],
};
