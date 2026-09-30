export default function ScenicSunsetBackdrop() {
  return (
    <div className="scenic-sunset-wrapper" aria-hidden="true">
      <svg
        className="scenic-sunset-svg"
        viewBox="0 0 1600 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Dying Twilight Sky Gradient */}
          <linearGradient id="skyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#1a0407" />
            <stop offset="28%" stopColor="#3d0a0f" />
            <stop offset="55%" stopColor="#6e1418" />
            <stop offset="72%" stopColor="#9e221b" />
            <stop offset="85%" stopColor="#ce3f1a" />
            <stop offset="94%" stopColor="#f46e22" />
            <stop offset="100%" stopColor="#ffa036" />
          </linearGradient>

          {/* Low Sunset Sun Radial Flare */}
          <radialGradient id="sunBloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#fff8db" />
            <stop offset="50%" stopColor="#ffa938" />
            <stop offset="75%" stopColor="#e84518" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#9e221b" stopOpacity="0" />
          </radialGradient>

          {/* Valley Floor Shadow Haze */}
          <linearGradient id="valleyHaze" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e04e1e" stopOpacity="0" />
            <stop offset="50%" stopColor="#aa2519" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#120205" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* 1. Sky & Setting Sun */}
        <rect width="1600" height="900" fill="url(#skyGrad)" />

        <g transform="translate(1240, 312)">
          <circle cx="0" cy="0" r="160" fill="url(#sunBloom)" opacity="0.55" />
          <circle cx="0" cy="0" r="26" fill="#fff9e0" />
          <circle cx="0" cy="0" r="32" fill="#ffd05c" opacity="0.65" />
        </g>

        {/* 2. Distant Horizon Mountain Ridges */}
        <polygon
          points="0,375 140,340 310,368 470,325 640,358 810,318 970,348 1120,318 1205,328 1275,316 1370,336 1480,318 1600,332 1600,900 0,900"
          fill="#5a151b"
          opacity="0.65"
        />
        <polygon
          points="0,425 150,370 280,410 440,352 610,400 780,342 940,398 1090,346 1190,378 1320,335 1460,388 1600,360 1600,900 0,900"
          fill="#440f16"
          opacity="0.85"
        />

        <rect y="410" width="1600" height="490" fill="url(#valleyHaze)" />

        <polygon
          points="0,490 120,442 270,480 430,420 590,485 760,426 930,495 1090,440 1240,510 1420,450 1600,485 1600,900 0,900"
          fill="#2d080e"
        />

        {/* 3. Left Canyon Promontory with Bold Low-Poly Facets */}
        <polygon points="-40,900 -40,460 70,480 130,515 220,530 300,590 350,670 330,760 370,820 390,900" fill="#110305" />
        <polygon points="70,480 130,515 110,640 50,560" fill="#8c231c" />
        <polygon points="130,515 220,530 190,670 110,640" fill="#a82d20" />
        <polygon points="190,670 220,530 250,545 235,690" fill="#691819" />
        <polygon points="220,530 300,590 285,695 235,690" fill="#4d1114" />
        <polygon points="300,590 350,670 325,745 285,695" fill="#360a0e" />

        {/* 4. Right Cliff Wall & Outcrop Foundation */}
        <polygon points="1380,0 1620,0 1620,900 1160,900 1230,810 1280,750 1300,640 1350,420 1400,210" fill="#090103" />
        <polygon points="1400,210 1350,420 1365,418 1410,212" fill="#e05522" opacity="0.75" />
        <polygon points="1350,420 1300,640 1320,636 1365,418" fill="#bc3d1a" opacity="0.65" />
        <polygon points="1300,640 1280,750 1295,746 1320,636" fill="#882215" opacity="0.5" />

        {/* 5. Clean Architectural Cliff Ledge */}
        <polygon points="1040,630 1250,580 1360,600 1320,660 1080,695" fill="#0d0204" />
        {/* Crisp sunset edge on the stone platform */}
        <polygon points="1040,630 1250,580 1360,600 1352,605 1248,586 1045,635" fill="#e85b24" opacity="0.9" />
        <polygon points="1045,635 1248,586 1238,602 1058,646" fill="#9c2b18" opacity="0.6" />

        {/* ========================================================================= */}
        {/* 6. UNIFIED SEATED SENTINEL SILHOUETTE (No disjointed origami seams)       */}
        {/* Reclining back against wall, left knee high, right leg resting, arms atop knee */}
        {/* ========================================================================= */}
        <g id="sentinel-seamless-silhouette">
          {/* Fluid, unified figure silhouette */}
          <path
            d="
              M 1242 584 
              C 1242 584 1254 530 1235 480 
              C 1228 462 1218 450 1205 442
              L 1200 428
              C 1198 420 1192 414 1184 414
              C 1174 414 1168 422 1168 430
              L 1164 444
              C 1150 455 1134 472 1128 488
              C 1122 502 1118 518 1118 528
              C 1118 534 1122 540 1128 538
              C 1132 536 1136 530 1138 522
              L 1134 595
              L 1106 612
              L 1114 624
              L 1152 616
              L 1150 568
              L 1172 582
              L 1100 610
              L 1055 620
              L 1050 632
              L 1092 630
              L 1175 596
              C 1190 600 1230 596 1242 584
              Z
            "
            fill="#060102"
          />

          {/* Duster coat draping softly beneath seat */}
          <path
            d="M 1190 595 C 1220 596 1255 586 1262 570 C 1270 595 1255 628 1230 635 C 1215 638 1198 620 1185 605 Z"
            fill="#060102"
          />

          {/* Wide-Brimmed Hat (Single curved contour) */}
          <g transform="rotate(-12 1182 432)">
            {/* Crown */}
            <path
              d="M 1166 430 C 1166 414 1174 406 1184 406 C 1195 406 1202 414 1202 430 Z"
              fill="#060102"
            />
            {/* Brim */}
            <ellipse cx="1184" cy="430" rx="34" ry="7" fill="#060102" />
            {/* Sunset Rim Highlight across top edge of brim */}
            <path
              d="M 1150 430 C 1162 425 1206 425 1218 430"
              stroke="#ffa84a"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 1172 414 Q 1184 410 1196 414"
              stroke="#ff7d36"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Delicate Continuous Sunset Rim Lighting (facing sun) */}
          {/* Along upper left shoulder, chest collar, and high knee */}
          <path
            d="
              M 1176 448 
              C 1156 462 1138 480 1128 496
              C 1120 510 1118 522 1118 528
            "
            stroke="#ff8838"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Subtle warm rim glint on boot toe */}
          <path
            d="M 1050 632 L 1056 620 L 1068 622"
            stroke="#ff7728"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}