// 전역 변수
let earthMesh, camera, scene, renderer, raycaster, mouse;
let treatyData = [];
let pointMeshes = [];
const tooltip = document.getElementById('tooltip');

// 국가 좌표 API (예시)
const countryCoordinatesAPI = 'https://restcountries.com/v3.1/name/'; 

// 엑셀 파일 불러오기 및 파싱
Papa.parse("양자조약_엑셀다운로드[전체] (1).xls", {
  download: true,
  header: true,
  complete: (results) => {
    treatyData = results.data;
    init();
    animate();
  }
});

// Three.js 초기화
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  // Raycaster 및 mouse 객체 생성
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // 이벤트 리스너 추가
  window.addEventListener('resize', onWindowResize, false);
  document.addEventListener('mousemove', onMouseMove, false);

  // 지구본 텍스처 로드
  const textureLoader = new THREE.TextureLoader();
  const earthTexture = textureLoader.load('earth.jpg');
  
  // 지구본 생성 및 scene에 추가
  earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5, 32, 32),
    new THREE.MeshBasicMaterial({ map: earthTexture })
  );
  scene.add(earthMesh);

  // 조약 정보 표시를 위한 점 생성 및 추가
  Promise.all(treatyData.map(treaty => getCountryCoordinates(treaty["체결대상국가"])))
    .then(coordinates => {
      coordinates.forEach((coord, index) => {
        if (coord) {
          const pointMesh = createPointMesh(coord, treatyData[index]);
          scene.add(pointMesh);
          pointMeshes.push(pointMesh);
        }
      });
    });

  camera.position.z = 10;
}

// 국가 좌표 가져오기 (API 사용 예시)
function getCountryCoordinates(countryName) {
  return fetch(`${countryCoordinatesAPI}${countryName}`)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        return { lat: data[0].latlng[0], lon: data[0].latlng[1] };
      } else {
        console.warn(`좌표를 찾을 수 없습니다: ${countryName}`);
        return null;
      }
    })
    .catch(error => {
      console.error(`좌표 API 호출 오류: ${error}`);
      return null;
    });
}

// 점 mesh 생성 함수
function createPointMesh(coordinates, treaty) {
  // 좌표 변환
  const spherical = new THREE.Spherical(
    5.1, 
    THREE.MathUtils.degToRad(90 - coordinates.lat),
    THREE.MathUtils.degToRad(coordinates.lon)
  );
  const vector = new THREE.Vector3().setFromSpherical(spherical);

  // 점 mesh 생성 및 위치 설정
  const pointGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
  pointMesh.position.copy(vector);
  pointMesh.userData = treaty; // 조약 데이터 저장
  return pointMesh;
}

// 윈도우 크기 변경 이벤트 핸들러
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// 마우스 이동 이벤트 핸들러
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Raycaster 업데이트
  raycaster.setFromCamera(mouse, camera);

  // Raycaster와 교차하는 객체 찾기
  const intersects = raycaster.intersectObjects(pointMeshes);

  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    const treaty = intersectedObject.userData;

    // Tooltip 내용 설정 및 표시
    tooltip.innerHTML = `
      <b>${treaty["체결대상국가"]}</b><br>
      분야: ${treaty["분야"]}<br>
      조약명: ${treaty["조약명"]}<br>
      서명/교환일: ${treaty["서명일/각서교환일"]}<br>
      발효일: ${treaty["발효일"]}<br>
    `;
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY - 10}px`;
    tooltip.style.visibility = 'visible';
  } else {
    // 교차하는 객체가 없는 경우 tooltip 숨기기
    tooltip.style.visibility = 'hidden';
  }
}

// 애니메이션 루프
function animate() {
  requestAnimationFrame(animate);
  earthMesh.rotation.y += 0.001; // 지구본 회전 (선택 사항)
  renderer.render(scene, camera);
}
