window.addEventListener('DOMContentLoaded', () => {
  // ตาราง Lookup: กำลังส่องสว่างเฉลี่ยของดาวแต่ละประเภท (L★/L⊙)
  const avgLumData = {
    "O5": 845999.98, "O6": 274999.99, "O7": 220000.00, "O8": 150000.00, "O9": 95000.00,
    "B0": 20000.00, "B1": 4600.00, "B2": 2600.00, "B3": 900.00, "B5": 360.00,
    "B6": 250.00, "B7": 175.00, "B8": 100.00, "B9": 62.00, "Bave": 1430.94,
    "A0": 22.00, "A1": 18.00, "A2": 15.00, "A3": 12.00, "A4": 10.00,
    "A5": 9.00, "A7": 6.70, "Aave": 13.16,
    "F0": 4.30, "F2": 3.30, "F3": 2.80, "F5": 2.40, "F6": 2.10,
    "F7": 1.80, "F8": 1.70,
    "G2": 1.00, "G5": 0.86, "G8": 0.68, "Gave": 0.56,
    "K0": 0.54, "K1": 0.46, "K2": 0.38, "K3": 0.31, "K4": 0.24,
    "K5": 0.19, "K7": 0.10, "Kave": 0.12,
    "M0": 0.07, "M1": 0.06, "M2": 0.05, "M3": 0.05, "M4": 0.02,
    "M5": 0.03, "M6": 0.02, "M7": 0.01, "M8": 0.01, "Mave": 0.01
  };

  // ค่าคงที่สำหรับแปลง AU → m
  const AU_TO_M = 1.496e11;

  // เก็บค่ารัศมีแบบดิบ (หน่วย AU)
  let rawInnerAU = 0;
  let rawOuterAU = 0;

  // อ้างอิง DOM element ต่าง ๆ
  const spectralType = document.getElementById('spectralType');
  const subType = document.getElementById('subType');
  const lumAvg = document.getElementById('lumAvg');
  const btnTypeShow = document.getElementById('btnTypeShow');
  const typeResult = document.getElementById('typeResult');
  const minR = document.getElementById('minR');
  const maxR = document.getElementById('maxR');
  const btnShowMin = document.getElementById('btnShowMin');
  const btnShowMax = document.getElementById('btnShowMax');
  const btnShowAll = document.getElementById('btnShowAll');
  const unitSelect = document.getElementById('unitSelect');
  const loDetails = document.getElementById('loDetails');

  // เตรียม canvas
  const canvas = document.getElementById('hzCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 300;

  // ค่าคงที่สำหรับ layout
  const STAR_RADIUS = 20;
  const MARGIN_LEFT = STAR_RADIUS + 20;
  const MARGIN_RIGHT = 20;

  // ฟังก์ชันคำนวณระยะขอบเขตเอื้อชีวิต
  function computeHZ(L) {
    const s = Math.sqrt(L);
    return { inner: 0.75 * s, outer: 1.77 * s };
  }

  // จัดรูปแบบตัวเลขให้มี comma
  function formatNumber(value, decimals = 2) {
    const fixed = Number(value).toFixed(decimals);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  // อัปเดต input ตามหน่วยที่เลือก
  function updateInputs() {
    const unit = unitSelect.value;
    if (unit === 'm') {
      minR.value = formatNumber((rawInnerAU * AU_TO_M).toFixed(2));
      maxR.value = formatNumber((rawOuterAU * AU_TO_M).toFixed(2));
    } else {
      minR.value = formatNumber(rawInnerAU.toFixed(2));
      maxR.value = formatNumber(rawOuterAU.toFixed(2));
    }
  }

  // เคลียร์ canvas
  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // วาดเส้นฐานและดาว
  function drawBase() {
    const y = canvas.height / 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT, y);
    ctx.lineTo(canvas.width - MARGIN_RIGHT, y);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(MARGIN_LEFT, y, STAR_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.stroke();

    return y;
  }

  // วาดโซน HZ เป็นแถบเขียวครึ่งวง
  function drawHZ(y, pxMin, pxMax) {
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT + pxMin, y);
    ctx.arc(MARGIN_LEFT, y, pxMin, 0, Math.PI, true);
    ctx.lineTo(MARGIN_LEFT + pxMax, y);
    ctx.arc(MARGIN_LEFT, y, pxMax, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = 'rgba(144,238,144,0.5)';
    ctx.fill();
  }

  // วาดเส้นโค้งขอบ HZ
  function drawHalfArc(y, px, color) {
    ctx.beginPath();
    ctx.arc(MARGIN_LEFT, y, px, Math.PI / 2, -Math.PI / 2, true);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // วาด marker + label
  function drawMarkerWithLabel(y, px, color, degLabel, distAU) {
    const r = 8;
    const cx = MARGIN_LEFT + px;

    ctx.beginPath();
    ctx.arc(cx, y, r, Math.PI * 1.25, Math.PI * 1.75);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';

    // อุณหภูมิ (100°, 0°)
    const twDeg = ctx.measureText(degLabel).width;
    ctx.fillText(degLabel, cx - twDeg / 2 - 50, y - r - 16);

    // ระยะทาง
    const unit = unitSelect.value;
    const dist = unit === 'm' ? distAU * AU_TO_M : distAU;
    const text = unit === 'm' ? formatNumber(dist.toFixed(2)) + ' m' : formatNumber(dist.toFixed(2)) + ' AU';
    const tw = ctx.measureText(text).width;
    let dx = cx - tw / 2 - 90;
    if (dx < MARGIN_LEFT) dx = MARGIN_LEFT;
    if (dx + tw > canvas.width - MARGIN_RIGHT) dx = canvas.width - MARGIN_RIGHT - tw;

    ctx.fillText(text, dx, y + r + 20);
  }

  // แสดง inner zone
  function showInner() {
    clearCanvas();
    const y = drawBase();
    const scale = (canvas.width - MARGIN_LEFT - MARGIN_RIGHT) / rawOuterAU;
    const px = rawInnerAU * scale;
    drawHalfArc(y, px, '#fff');
    drawMarkerWithLabel(y, px, '#fff', '100°', rawInnerAU);
  }

  // แสดง outer zone
  function showOuter() {
    clearCanvas();
    const y = drawBase();
    const scale = (canvas.width - MARGIN_LEFT - MARGIN_RIGHT) / rawOuterAU;
    const px = rawOuterAU * scale;
    drawHalfArc(y, px, '#fff');
    drawMarkerWithLabel(y, px, '#fff', '0°', rawOuterAU);
  }

  // แสดงขอบเขตทั้งหมด
  function showAll() {
    clearCanvas();
    const y = drawBase();
    const scale = (canvas.width - MARGIN_LEFT - MARGIN_RIGHT) / rawOuterAU;
    const pxMin = rawInnerAU * scale;
    const pxMax = rawOuterAU * scale;

    drawHZ(y, pxMin, pxMax);
    drawHalfArc(y, pxMin, '#fff');
    drawHalfArc(y, pxMax, '#fff');
    drawMarkerWithLabel(y, pxMin, '#fff', '100°', rawInnerAU);
    drawMarkerWithLabel(y, pxMax, '#fff', '0°', rawOuterAU);

    // อัปเดตรายละเอียดด้านล่าง
    const unit = unitSelect.value;
    const dMin = unit === 'm' ? rawInnerAU * AU_TO_M : rawInnerAU;
    const dMax = unit === 'm' ? rawOuterAU * AU_TO_M : rawOuterAU;
    const w = dMax - dMin;

    loDetails.innerHTML = `
      <div><strong>Inner (100 °C):</strong> ${formatNumber(dMin.toFixed(2))} ${unit === 'm' ? 'm' : 'AU'}</div>
      <div><strong>Outer (0 °C):</strong> ${formatNumber(dMax.toFixed(2))} ${unit === 'm' ? 'm' : 'AU'}</div>
      <div><strong>Width:</strong> ${formatNumber(w.toFixed(2))} ${unit === 'm' ? 'm' : 'AU'}</div>
    `;
  }

  // เมื่อกดปุ่ม Show → คำนวณและแสดงข้อมูล
  btnTypeShow.addEventListener('click', () => {
    const key = spectralType.value + subType.value;
    const avg = avgLumData[key] || 0;
    lumAvg.value = avg ? formatNumber(avg.toFixed(2)) : '–';
    const { inner, outer } = computeHZ(avg);
    rawInnerAU = inner;
    rawOuterAU = outer;
    updateInputs();

    typeResult.innerHTML = `
      <div><strong>L★/L⊙ Avg:</strong> ${avg ? formatNumber(avg.toFixed(2)) : '–'}</div>
      <div><strong>rₘᵢₙ (100 °C):</strong> ${formatNumber(inner.toFixed(2))} AU</div>
      <div><strong>rₒᵤₜ (0 °C):</strong> ${formatNumber(outer.toFixed(2))} AU</div>
    `;
  });

  // กำหนดว่าเมื่อคลิกหรือเลือกค่า → ให้แสดงข้อมูล
  spectralType.addEventListener('click', showAll);
  subType.addEventListener('click', showAll);
  btnShowAll.addEventListener('click', showAll);
  btnTypeShow.addEventListener('click', showAll);
  unitSelect.addEventListener('click', showAll); 
  unitSelect.addEventListener('change', updateInputs);
	unitSelect.addEventListener('change', showAll);


  // ปุ่มแสดงขอบเขตแยก
  btnShowMin.addEventListener('click', showInner);
  btnShowMax.addEventListener('click', showOuter);

  // รีเซ็ตค่าเมื่อเปลี่ยน filter
  [spectralType, subType].forEach(el => el.addEventListener('change', () => {
    lumAvg.value = '–';
    minR.value = '';
    maxR.value = '';
    typeResult.innerHTML = '';
    loDetails.innerHTML = '';
    clearCanvas();
  }));
});
