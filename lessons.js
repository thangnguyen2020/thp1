// =====================================================================
//  GIÁO TRÌNH – xếp theo đúng THỨ TỰ mục lục của Alfred's Adult All-in-One
//  Course, Level 1 (số trang "page" là trang tương ứng trong sách).
//  Bài tập do app tự soạn. Các bài có tên bài hát là dân ca / nhạc cổ điển
//  đã hết bản quyền, được viết lại theo cách đơn giản của app.
//
//  ---------------- CÁCH VIẾT MỘT BÀI ----------------
//  {
//    page: 13,                        số trang trong sách
//    title: "Tên bài",
//    read: ["Đoạn 1", "Đoạn 2"],      (tùy chọn) phần lý thuyết hiện trước khi chơi
//    rh: "...",                       (tùy chọn) nốt TAY PHẢI  -> khóa Sol
//    lh: "...",                       (tùy chọn) nốt TAY TRÁI  -> khóa Fa
//                                     có cả rh và lh -> khuông kép
//    time: 4,                         số phách mỗi ô nhịp (mặc định 4)
//    pickup: 3,                       (tùy chọn) ô nhịp lấy đà có 3 phách
//    tempo: 60,                       tốc độ gợi ý cho máy đếm nhịp
//    soon: true                       bài chưa soạn, hiện "Sắp có" trong mục lục
//  }
//
//  ---------------- CÁCH VIẾT NỐT ----------------
//  Mỗi nốt viết liền:  TÊN:TRƯỜNG_ĐỘ:NGÓN    ví dụ  C4:q:1
//    Tên nốt  : C=Đô D=Rê E=Mi F=Fa G=Sol A=La B=Si + số quãng tám.
//               C4 = Đô giữa, C3 = Đô thấp, B2 = Si thấp. Thăng: F#4, giáng: Bb3
//    Trường độ: w = tròn (4 phách)   hd = trắng chấm dôi (3)   h = trắng (2)
//               qd = đen chấm dôi (1,5)   q = đen (1)   8 = móc đơn (1/2)
//    Ngón     : 1 (cái) đến 5 (út). Có thể bỏ trống.
//  Hợp âm   : nối các nốt bằng dấu +   ví dụ  C3+E3+G3:w:5+3+1
//  Dấu lặng : r:q  r:h  r:w ...
//  Dấu nối  : thêm ~ sau trường độ của nốt đầu   ví dụ  C4:w~:1 C4:w
//  Dấu luyến: ( trước nốt đầu, ) sau nốt cuối    ví dụ  (C4:q:1 D4:q E4:q)
//  Cường độ : !p  !mf  !f  ... đặt trước nốt     ví dụ  !mf C4:q:1
//  Hợp âm ký hiệu: @C  @G7 ... đặt trước nốt tay phải
//  Dấu |    : vạch nhịp, chỉ để dễ đọc (app tự kẻ vạch nhịp).
// =====================================================================

const UNITS = [
  {
    title: "Làm quen với đàn",
    lessons: [
      {
        page: 4, title: "Khởi động trước khi chơi",
        read: [
          "Ngồi thẳng, thả lỏng vai. Xoay vai ra sau 5 lần, rồi ra trước 5 lần.",
          "Duỗi các ngón tay thật rộng, giữ 2 giây rồi nắm nhẹ lại. Lặp lại 5 lần.",
          "Thả lỏng cổ tay và lắc nhẹ như đang vẩy nước, khoảng 10 giây.",
          "Đặt hai bàn tay lên mặt bàn, lần lượt nhấc từng ngón lên rồi đặt xuống, từ ngón 1 đến ngón 5, rồi ngược lại."
        ]
      },
      {
        page: 6, title: "Tư thế ngồi đàn",
        read: [
          "Đặt ghế đối diện giữa đàn, ngang phím Đô giữa (gần logo YAMAHA trên đàn P-45).",
          "Ngồi ở nửa trước của ghế, lưng thẳng, người hơi nghiêng về phía trước.",
          "Chỉnh ghế để cẳng tay gần như song song với mặt sàn, khuỷu tay ngang hoặc hơi cao hơn phím đàn.",
          "Ngồi đủ xa để khuỷu tay hơi đưa ra trước thân người. Hai bàn chân đặt phẳng trên sàn, chân phải gần bàn đạp."
        ]
      },
      {
        page: 7, title: "Số ngón tay · Âm thanh của đàn",
        read: [
          "Mỗi ngón tay có một số: ngón cái = 1, trỏ = 2, giữa = 3, áp út = 4, út = 5. Cả hai tay đánh số giống nhau.",
          "Trên bàn phím: đi sang phải là âm cao hơn, đi sang trái là âm thấp hơn.",
          "Đàn P-45 cảm ứng lực bấm: bấm mạnh thì to, bấm nhẹ thì nhỏ. Hãy thử bấm một phím thật nhẹ rồi thật mạnh để nghe khác biệt.",
          "Bài tập: gõ nhẹ từng ngón xuống đùi theo số 1-2-3-4-5, lần lượt từng tay."
        ]
      },
      {
        page: 8, title: "Bàn phím",
        read: [
          "Phím đen xếp thành từng nhóm 2 phím và nhóm 3 phím, lặp lại suốt bàn phím.",
          "Hãy dùng ngón 2 và 3 bấm tất cả các nhóm 2 phím đen, từ thấp lên cao.",
          "Sau đó dùng ngón 2, 3 và 4 bấm tất cả các nhóm 3 phím đen.",
          "Các nhóm phím đen là \"cột mốc\" giúp ta tìm tên phím trắng ở bài sau."
        ]
      },
      {
        page: 9, title: "Gọi tên phím trắng",
        mode: "find",
        read: [
          "Phím trắng mang tên 7 nốt lặp lại: Đô Rê Mi Fa Sol La Si (C D E F G A B).",
          "Đô (C) nằm ngay bên trái nhóm 2 phím đen. Fa (F) nằm ngay bên trái nhóm 3 phím đen.",
          "Trò chơi: app hiện tên một nốt, anh bấm phím đó ở bất kỳ quãng tám nào. Bấm sai, app mới gợi ý vị trí."
        ],
        rh: "C4:q D4:q E4:q C4:q | F4:q G4:q A4:q B4:q | D4:q F4:q A4:q C4:q | E4:q G4:q B4:q D4:q | F4:q C4:q G4:q E4:q | A4:q D4:q B4:q F4:q"
      },
      {
        page: 10, title: "Bài tập đẳng trường · Xoa bóp bàn tay",
        read: [
          "Đặt hai lòng bàn tay áp vào nhau trước ngực, ép nhẹ vào nhau trong 5 giây rồi thả lỏng. Lặp lại 3 lần.",
          "Móc các đầu ngón hai tay vào nhau, kéo nhẹ sang hai bên 5 giây rồi thả. Lặp lại 3 lần.",
          "Xoa bóp: dùng ngón cái tay này day nhẹ lòng bàn tay kia theo vòng tròn, rồi vuốt dọc từng ngón từ gốc ra đầu ngón. Đổi tay."
        ]
      },
      {
        page: 11, title: "Vì sao nên chơi với ngón tay cong",
        read: [
          "Hãy để bàn tay cong tự nhiên như đang úp lên một quả cam.",
          "1. Ngón cong làm bàn tay vững như mái vòm, các ngón khỏe hơn.",
          "2. Ngón cái và ngón út chạm phím ngang hàng với các ngón khác.",
          "3. Ngón cong di chuyển nhanh và linh hoạt hơn.",
          "4. Dễ điều khiển âm thanh to, nhỏ hơn. Chạm phím bằng đầu ngón, ngón cái chạm bằng cạnh."
        ]
      }
    ]
  },
  {
    title: "Vị trí Đô",
    lessons: [
      {
        page: 12, title: "Vị trí Đô tay phải · Khởi động tay phải", tempo: 60,
        read: ["Vị trí Đô tay phải: ngón 1 trên Đô giữa, các ngón 2-3-4-5 đặt lên Rê-Mi-Fa-Sol. Giữ bàn tay yên, chỉ ngón tay di chuyển."],
        rh: "C4:q:1 D4:q:2 E4:q:3 F4:q:4 | G4:q:5 F4:q:4 E4:q:3 D4:q:2 | C4:q:1 D4:q E4:q F4:q | G4:w:5 | G4:q:5 F4:q E4:q D4:q | C4:w:1"
      },
      {
        page: 13, title: "Nốt đen & nốt trắng · Ô nhịp, vạch nhịp · Ode to Joy (Beethoven)", tempo: 66,
        read: [
          "Nốt đen = 1 phách, đếm \"1\". Nốt trắng = 2 phách, đếm \"1-2\".",
          "Vạch nhịp chia bản nhạc thành các ô nhịp bằng nhau. Vạch kép (một vạch mảnh, một vạch đậm) báo hiệu kết thúc bài."
        ],
        rh: "E4:q:3 E4:q F4:q:4 G4:q:5 | G4:q F4:q E4:q D4:q:2 | C4:q:1 C4:q D4:q E4:q | E4:h:3 D4:h:2 | E4:q:3 E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | D4:h:2 C4:h:1"
      },
      {
        page: 14, title: "Khóa Sol", tempo: 60,
        read: [
          "Khóa Sol được vẽ quấn quanh dòng kẻ thứ 2 (tính từ dưới lên): nốt trên dòng đó là Sol (G4). Tay phải thường đọc khóa Sol.",
          "Đô giữa nằm trên một dòng kẻ phụ ngắn phía dưới khuông. Rê nằm ngay dưới khuông, Mi trên dòng 1, Fa ở khe 1, Sol trên dòng 2."
        ],
        rh: "G4:h:5 E4:h:3 | C4:h:1 E4:h:3 | D4:q:2 F4:q:4 E4:q D4:q | C4:w:1 | G4:q:5 F4:q E4:q G4:q | F4:q E4:q D4:q F4:q | E4:q D4:q C4:q D4:q | C4:w"
      },
      {
        page: 16, title: "Vị trí Đô tay trái · Khởi động tay trái", tempo: 60,
        read: ["Vị trí Đô tay trái: ngón 5 trên Đô thấp (Đô dưới Đô giữa), ngón 1 trên Sol. Số ngón tay trái đi ngược với tay phải: đi lên là 5-4-3-2-1."],
        lh: "C3:q:5 D3:q:4 E3:q:3 F3:q:2 | G3:q:1 F3:q:2 E3:q:3 D3:q:4 | C3:q:5 D3:q E3:q F3:q | G3:w:1 | G3:q:1 F3:q E3:q D3:q | C3:w:5"
      },
      {
        page: 17, title: "Nốt tròn · Bài luyện \"Tiếng chuông ngân\"", tempo: 72,
        read: ["Nốt tròn = 4 phách, đếm \"1-2-3-4\". Giữ phím cho đến hết phách 4 rồi mới nhấc lên."],
        rh: "C4:w:1 | E4:w:3 | G4:w:5 | E4:h:3 D4:h:2 | G4:h:5 F4:h:4 | E4:h:3 D4:h:2 | C4:w:1"
      },
      {
        page: 18, title: "Khóa Fa", tempo: 60,
        read: [
          "Khóa Fa có hai dấu chấm kẹp dòng kẻ thứ 4: nốt trên dòng đó là Fa (F3), phím Fa ngay dưới Đô giữa. Tay trái thường đọc khóa Fa.",
          "Đô giữa nằm trên dòng kẻ phụ ngắn phía TRÊN khuông khóa Fa."
        ],
        lh: "F3:q:2 F3:q F3:q F3:q | F3:h:2 G3:h:1 | F3:h:2 E3:h:3 | D3:h:4 C3:h:5 | C3:q:5 E3:q:3 G3:q:1 E3:q | C3:w:5"
      }
    ]
  },
  {
    title: "Khuông nhạc kép",
    lessons: [
      {
        page: 20, title: "Khuông kép · Số chỉ nhịp · Dấu lặng tròn · Chơi trên khuông kép", tempo: 60,
        read: [
          "Khuông kép gồm khuông khóa Sol (tay phải) ở trên và khuông khóa Fa (tay trái) ở dưới, nối với nhau bằng dấu ngoặc.",
          "Số chỉ nhịp 4/4: số trên cho biết mỗi ô có 4 phách, số dưới (4) cho biết nốt đen được 1 phách.",
          "Dấu lặng tròn (hình chữ nhật nhỏ treo dưới dòng 4) = nghỉ trọn một ô nhịp. Khi một tay nghỉ, tay kia chơi."
        ],
        rh: "C4:q:1 D4:q:2 E4:q:3 F4:q:4 | G4:w:5 | r:w | r:w | E4:q:3 D4:q:2 C4:h:1 | r:w",
        lh: "r:w | r:w | G3:q:1 F3:q:2 E3:q:3 D3:q:4 | C3:w:5 | r:w | C3:w:5"
      }
    ]
  },
  {
    title: "Chơi Đô – Sol trên khuông kép",
    lessons: [
      {
        page: 21, title: "Dấu lặng đen · Bài luyện \"Nhịp bước\"", tempo: 66,
        read: ["Dấu lặng đen = nghỉ 1 phách. Khi gặp dấu lặng, nhấc tay lên nhẹ nhàng và vẫn đếm phách."],
        rh: "C4:q:1 E4:q:3 G4:q:5 r:q | G4:q:5 E4:q:3 C4:q:1 r:q | r:w | r:w | D4:q:2 F4:q:4 E4:q:3 r:q | C4:w:1",
        lh: "r:w | r:w | C3:q:5 E3:q:3 G3:q:1 r:q | G3:q:1 E3:q:3 C3:q:5 r:q | r:w | r:w"
      },
      {
        page: 22, title: "Đếm và viết nhạc nhịp 4/4", tempo: 60,
        read: [
          "Đếm to khi chơi: nốt đen \"1\", nốt trắng \"1-2\", nốt tròn \"1-2-3-4\". Dấu lặng cũng phải đếm.",
          "Bài này hãy bật máy đếm nhịp ở tốc độ 60 để luyện đếm đều."
        ],
        rh: "C4:h:1 E4:h:3 | G4:q:5 G4:q r:h | r:w | r:w | E4:q:3 D4:q:2 C4:h:1",
        lh: "r:w | r:w | G3:h:1 E3:h:3 | C3:q:5 C3:q r:h | r:w"
      },
      {
        page: 23, title: "Lightly Row – Thuyền nhẹ trôi (dân ca)", tempo: 72,
        read: ["Câu 1 tay phải, câu 2 tay trái chơi lại giai điệu thấp hơn một quãng tám."],
        rh: "G4:q:5 E4:q:3 E4:h | F4:q:4 D4:q:2 D4:h | C4:q:1 D4:q E4:q F4:q | G4:q:5 G4:q G4:h | r:w | r:w | r:w | r:w",
        lh: "r:w | r:w | r:w | r:w | G3:q:1 E3:q:3 E3:h | F3:q:2 D3:q:4 D3:h | C3:q:5 E3:q:3 G3:q:1 G3:q | C3:w:5"
      },
      {
        page: 24, title: "Quãng giai điệu · Cường độ p, mf · Au clair de la lune (dân ca Pháp)", tempo: 72,
        read: [
          "Quãng là khoảng cách giữa hai nốt. Hai nốt chơi lần lượt tạo thành quãng giai điệu.",
          "p (piano) = chơi nhẹ. mf (mezzo forte) = vừa phải. Đàn P-45 cảm ứng lực, nên hãy bấm nhẹ hoặc mạnh hơn theo ký hiệu."
        ],
        rh: "!mf C4:q:1 C4:q C4:q D4:q:2 | E4:h:3 D4:h:2 | C4:q:1 E4:q:3 D4:q:2 D4:q | C4:w:1 | r:w | r:w | r:w | r:w",
        lh: "r:w | r:w | r:w | r:w | !p C3:q:5 C3:q C3:q D3:q:4 | E3:h:3 D3:h:4 | C3:q:5 E3:q:3 D3:q:4 D3:q | C3:w:5"
      },
      {
        page: 25, title: "Đo quãng 2 và quãng 3 (giai điệu)", tempo: 66,
        read: [
          "Quãng 2: hai phím trắng kề nhau. Trên khuông: từ dòng sang khe kề bên (hoặc ngược lại).",
          "Quãng 3: bỏ qua một phím trắng. Trên khuông: từ dòng lên dòng kế tiếp, hoặc khe lên khe."
        ],
        rh: "C4:q:1 D4:q:2 C4:q:1 E4:q:3 | D4:q:2 E4:q:3 D4:q:2 F4:q:4 | E4:q:3 F4:q:4 E4:q:3 G4:q:5 | F4:q:4 D4:q:2 E4:q:3 C4:q:1 | C4:w:1"
      },
      {
        page: 26, title: "Quãng hòa âm · Dấu f · Bài luyện \"Quãng vui nhộn\"", tempo: 60,
        read: [
          "Hai nốt chơi cùng một lúc tạo thành quãng hòa âm. Bấm hai phím thật đều, cùng lúc.",
          "f (forte) = chơi to."
        ],
        rh: "!f C4+E4:h:1+3 C4+E4:h | D4+F4:h:2+4 D4+F4:h | E4+G4:h:3+5 E4+G4:h | C4+G4:w:1+5"
      },
      {
        page: 27, title: "Đo quãng 2 và quãng 3 hòa âm", tempo: 60,
        rh: "C4+D4:h:1+2 C4+E4:h:1+3 | D4+E4:h:2+3 D4+F4:h:2+4 | r:w | r:w | E4+G4:w:3+5",
        lh: "r:w | r:w | C3+D3:h:5+4 C3+E3:h:5+3 | D3+F3:h:4+2 E3+G3:h:3+1 | r:w"
      },
      {
        page: 28, title: "Quãng 4 và quãng 5 (giai điệu)", tempo: 66,
        read: [
          "Quãng 4: bỏ qua hai phím trắng. Trên khuông: từ dòng lên khe, hoặc khe lên dòng.",
          "Quãng 5: bỏ qua ba phím trắng, ở vị trí Đô là ngón 1 và ngón 5 (Đô – Sol). Trên khuông: dòng lên dòng cách một dòng."
        ],
        rh: "C4:q:1 F4:q:4 C4:q:1 G4:q:5 | D4:q:2 G4:q:5 D4:q:2 G4:q:5 | C4:h:1 G4:h:5 | F4:q:4 E4:q:3 D4:q:2 C4:q:1 | G4:h:5 C4:h:1"
      },
      {
        page: 29, title: "Đo quãng 4 và quãng 5 giai điệu", tempo: 66,
        lh: "C3:q:5 F3:q:2 C3:q:5 G3:q:1 | D3:q:4 G3:q:1 D3:q:4 G3:q:1 | C3:h:5 G3:h:1 | F3:q:2 E3:q:3 D3:q:4 C3:q:5 | C3:w:5"
      },
      {
        page: 30, title: "Quãng 4 và 5 hòa âm · Jingle Bells (J. Pierpont)", tempo: 80,
        read: ["Tay trái giữ quãng hòa âm (Đô–Sol hoặc Đô–Fa) suốt cả ô nhịp, tay phải chơi giai điệu."],
        rh: "E4:q:3 E4:q E4:h | E4:q E4:q E4:h | E4:q:3 G4:q:5 C4:q:1 D4:q:2 | E4:w:3 | F4:q:4 F4:q F4:q F4:q | F4:q E4:q E4:q E4:q | E4:q D4:q:2 D4:q E4:q:3 | D4:h:2 G4:h:5",
        lh: "C3+G3:w:5+1 | C3+G3:w | C3+G3:w | C3+G3:w | C3+F3:w:5+2 | C3+G3:w:5+1 | C3+G3:w | D3+G3:w:4+1"
      },
      {
        page: 31, title: "Đo quãng 4 và quãng 5 hòa âm", tempo: 60,
        rh: "C4+F4:h:1+4 C4+G4:h:1+5 | D4+G4:w:2+5 | r:w | r:w | C4+G4:w:1+5",
        lh: "r:w | r:w | C3+F3:h:5+2 C3+G3:h:5+1 | D3+G3:w:4+1 | C3+G3:w:5+1"
      }
    ]
  },
  {
    title: "Làm quen hợp âm",
    lessons: [
      {
        page: 32, title: "Hợp âm Đô trưởng", tempo: 60,
        read: [
          "Hợp âm là ba nốt trở lên vang cùng lúc. Hợp âm Đô trưởng (C) gồm Đô – Mi – Sol.",
          "Tay trái vị trí Đô: ngón 5-3-1. Đầu tiên chơi rải từng nốt, sau đó bấm cả ba nốt cùng lúc."
        ],
        lh: "C3:q:5 E3:q:3 G3:q:1 r:q | C3+E3+G3:w:5+3+1 | C3:q:5 E3:q:3 G3:q:1 E3:q:3 | C3+E3+G3:h:5+3+1 C3+E3+G3:h | C3+E3+G3:w"
      },
      {
        page: 33, title: "Dấu lặng trắng · Kìa con bướm vàng (giai điệu Frère Jacques)", tempo: 72,
        read: ["Dấu lặng trắng = nghỉ 2 phách. Nó trông như chiếc mũ úp, nằm TRÊN dòng kẻ thứ 3 (dấu lặng tròn thì treo DƯỚI dòng 4)."],
        rh: "C4:q:1 D4:q:2 E4:q:3 C4:q:1 | C4:q D4:q E4:q C4:q | E4:q:3 F4:q:4 G4:h:5 | E4:q:3 F4:q G4:h | r:w | r:w",
        lh: "r:w | r:w | r:w | r:w | C3+E3+G3:h:5+3+1 r:h | C3+E3+G3:h r:h"
      },
      {
        page: 34, title: "Nốt Si tay trái · Hai hợp âm quan trọng: C và G7", tempo: 60,
        read: [
          "Hợp âm Sol 7 (G7) tay trái ở vị trí Đô: Si – Fa – Sol, ngón 5-2-1.",
          "Đổi từ C sang G7: ngón 5 lùi xuống Si, ngón 2 bấm Fa, ngón 1 giữ nguyên trên Sol."
        ],
        lh: "C3+E3+G3:w:5+3+1 | B2+F3+G3:w:5+2+1 | C3+E3+G3:h B2+F3+G3:h | C3+E3+G3:h B2+F3+G3:h | B2+F3+G3:h C3+E3+G3:h | C3+E3+G3:w"
      },
      {
        page: 35, title: "Nốt nối · Merrily We Roll Along (dân ca)", tempo: 80,
        read: ["Dấu nối là đường cong nối hai nốt CÙNG cao độ. Chỉ bấm nốt đầu, rồi giữ phím đủ thời gian của cả hai nốt."],
        rh: "E4:q:3 D4:q:2 C4:q:1 D4:q | E4:q E4:q E4:h | D4:q:2 D4:q D4:h | E4:q:3 G4:q:5 G4:h | E4:q:3 D4:q:2 C4:q:1 D4:q | E4:q E4:q E4:q E4:q | D4:q:2 D4:q E4:q:3 D4:q:2 | C4:w~:1 | C4:w"
      },
      {
        page: 36, title: "Nốt Si tay phải · Hợp âm C và G7 tay phải", tempo: 60,
        read: ["Hợp âm G7 tay phải: Si – Fa – Sol, ngón 1-4-5. Ngón 1 lùi xuống Si, ngón 4 bấm Fa, ngón 5 giữ trên Sol."],
        rh: "C4+E4+G4:w:1+3+5 | B3+F4+G4:w:1+4+5 | C4+E4+G4:h:1+3+5 B3+F4+G4:h:1+4+5 | C4+E4+G4:h:1+3+5 B3+F4+G4:h:1+4+5 | C4+E4+G4:w:1+3+5"
      },
      {
        page: 37, title: "Bài luyện \"Đi chợ phiên\" (tay phải giai điệu, tay trái hợp âm)", tempo: 72,
        rh: "E4:q:3 F4:q:4 G4:h:5 | G4:q F4:q E4:h | D4:q:2 E4:q:3 F4:h:4 | E4:q D4:q C4:h:1 | E4:q:3 F4:q G4:h | G4:q F4:q E4:h | D4:q:2 G4:q:5 F4:q:4 D4:q:2 | C4:w:1",
        lh: "C3+E3+G3:w:5+3+1 | C3+E3+G3:w | B2+F3+G3:w:5+2+1 | C3+E3+G3:w:5+3+1 | C3+E3+G3:w | C3+E3+G3:w | B2+F3+G3:w:5+2+1 | C3+E3+G3:w:5+3+1"
      },
      {
        page: 38, title: "Hợp âm G7 tay trái · Ký hiệu hợp âm", tempo: 72,
        read: ["Chữ C, G7 phía trên khuông nhạc là ký hiệu hợp âm: cho biết tay trái chơi hợp âm nào ở đoạn đó."],
        rh: "@C G4:q:5 E4:q:3 C4:h:1 | @G7 D4:q:2 F4:q:4 G4:h:5 | @C E4:q:3 D4:q:2 C4:q:1 E4:q:3 | @G7 D4:w:2 | @C G4:q:5 E4:q:3 C4:h:1 | @G7 F4:q:4 E4:q:3 D4:h:2 | @C C4:w:1",
        lh: "C3+E3+G3:w:5+3+1 | B2+F3+G3:w:5+2+1 | C3+E3+G3:w:5+3+1 | B2+F3+G3:w:5+2+1 | C3+E3+G3:w:5+3+1 | B2+F3+G3:w:5+2+1 | C3+E3+G3:w:5+3+1"
      },
      {
        page: 39, title: "Hợp âm G7 tay phải", tempo: 66,
        read: ["Lần này tay trái chơi giai điệu, tay phải giữ hợp âm."],
        rh: "@C C4+E4+G4:w:1+3+5 | @G7 B3+F4+G4:w:1+4+5 | @G7 B3+F4+G4:w | @C C4+E4+G4:w:1+3+5",
        lh: "C3:q:5 E3:q:3 G3:q:1 E3:q:3 | D3:q:4 F3:q:2 G3:h:1 | G3:q:1 F3:q:2 D3:q:4 B2:q:5 | C3:w:5"
      },
      {
        page: 40, title: "Nhịp 3/4 · Nốt trắng chấm dôi · Bài luyện \"Điệu valse nhỏ\"", time: 3, tempo: 80,
        read: [
          "Nhịp 3/4: mỗi ô nhịp có 3 phách, đếm \"1-2-3\", nhấn nhẹ phách 1.",
          "Dấu chấm sau nốt làm nốt dài thêm một nửa. Nốt trắng chấm dôi = 2 + 1 = 3 phách."
        ],
        rh: "C4:q:1 E4:q:3 G4:q:5 | G4:hd:5 | F4:q:4 D4:q:2 F4:q:4 | E4:hd:3 | E4:q:3 D4:q:2 C4:q:1 | D4:hd:2 | E4:q:3 D4:q:2 D4:q | C4:hd:1"
      },
      {
        page: 41, title: "Viết nhạc nhịp 3/4 · Ôn dấu cường độ", time: 3, tempo: 80,
        rh: "!p E4:q:3 F4:q:4 G4:q:5 | E4:hd:3 | !f G4:q:5 F4:q:4 E4:q:3 | D4:hd:2 | r:hd | r:hd",
        lh: "r:hd | r:hd | r:hd | r:hd | !mf C3+E3+G3:hd:5+3+1 | C3+E3+G3:hd"
      },
      {
        page: 42, title: "Dấu luyến & chơi liền tiếng (legato) · Bài luyện \"Dòng sông\"", tempo: 66,
        read: [
          "Dấu luyến là đường cong trên hoặc dưới một nhóm nốt KHÁC cao độ: chơi các nốt đó thật liền nhau (legato).",
          "Cách làm: nhấc ngón trước lên đúng lúc ngón sau bấm xuống, như bước chân đi bộ."
        ],
        rh: "(C4:q:1 D4:q:2 E4:q:3 F4:q:4 | G4:w:5) | (G4:q:5 F4:q:4 E4:q:3 D4:q:2 | C4:w:1) | (E4:q:3 F4:q:4 G4:q:5 E4:q:3 | D4:q:2 E4:q:3 C4:h:1)"
      },
      {
        page: 43, title: "Dấu luyến & dấu nối · Bài luyện \"Hoàng hôn\"", tempo: 60,
        read: ["Phân biệt: dấu nối nối hai nốt cùng cao độ (chỉ bấm một lần); dấu luyến bao các nốt khác nhau (chơi liền)."],
        rh: "(G4:q:5 E4:q:3 C4:h:1) | (D4:q:2 F4:q:4 E4:h:3) | D4:w~:2 | D4:w | r:w | r:w",
        lh: "r:w | r:w | r:w | r:w | (C3:q:5 E3:q:3 G3:h:1) | C3+E3+G3:w:5+3+1"
      },
      {
        page: 44, title: "Nốt La tay trái · Hợp âm Fa trưởng", tempo: 60,
        read: [
          "Hợp âm Fa trưởng (F) tay trái ở vị trí Đô: Đô – Fa – La, ngón 5-2-1.",
          "Đổi từ C sang F: ngón 5 giữ Đô, ngón 2 bấm Fa, ngón 1 nhích lên La."
        ],
        lh: "C3+E3+G3:w:5+3+1 | C3+F3+A3:w:5+2+1 | C3+E3+G3:h:5+3+1 C3+F3+A3:h:5+2+1 | C3+E3+G3:h:5+3+1 B2+F3+G3:h:5+2+1 | C3+E3+G3:w:5+3+1"
      },
      {
        page: 45, title: "Khởi động C, G7, F (tay trái) · Ô nhịp lấy đà · When the Saints Go Marching In", pickup: 3, tempo: 90,
        read: [
          "Bài bắt đầu bằng ô nhịp lấy đà (ô nhịp thiếu) chỉ có 3 phách. Khi bật máy đếm nhịp, hãy vào nốt đầu ở phách 2.",
          "Tay trái đổi giữa các hợp âm C, G7 và F theo ký hiệu."
        ],
        rh: "C4:q:1 E4:q:3 F4:q:4 | @C G4:w:5 | r:q C4:q:1 E4:q:3 F4:q:4 | G4:w:5 | r:q C4:q:1 E4:q:3 F4:q:4 | G4:h:5 E4:h:3 | C4:h:1 E4:h:3 | @G7 D4:w:2 | @C r:q E4:q:3 E4:q D4:q:2 | C4:hd:1 C4:q | E4:h:3 G4:q:5 G4:q | @F F4:w:4 | @C r:q E4:q:3 F4:q:4 G4:q:5 | E4:h:3 C4:h:1 | @G7 D4:h:2 D4:h | @C C4:w:1",
        lh: "r:hd | C3+E3+G3:w:5+3+1 | C3+E3+G3:w | C3+E3+G3:w | C3+E3+G3:w | C3+E3+G3:w | C3+E3+G3:w | B2+F3+G3:w:5+2+1 | C3+E3+G3:w:5+3+1 | C3+E3+G3:w | C3+E3+G3:w | C3+F3+A3:w:5+2+1 | C3+E3+G3:w:5+3+1 | C3+E3+G3:w | B2+F3+G3:w:5+2+1 | C3+E3+G3:w:5+3+1"
      },
      {
        page: 46, title: "Nốt La tay phải · Hợp âm C và F tay phải", tempo: 60,
        read: ["Hợp âm Fa trưởng tay phải: Đô – Fa – La, ngón 1-4-5. Ngón 1 giữ Đô, ngón 4 bấm Fa, ngón 5 nhích lên La."],
        rh: "C4+E4+G4:w:1+3+5 | C4+F4+A4:w:1+4+5 | C4+E4+G4:h:1+3+5 C4+F4+A4:h:1+4+5 | C4+E4+G4:h:1+3+5 B3+F4+G4:h:1+4+5 | C4+E4+G4:w:1+3+5"
      },
      {
        page: 47, title: "Khởi động C, G7, F (tay phải)", tempo: 66,
        rh: "@C C4+E4+G4:w:1+3+5 | @F C4+F4+A4:w:1+4+5 | @G7 B3+F4+G4:w:1+4+5 | @C C4+E4+G4:w:1+3+5",
        lh: "C3:q:5 D3:q:4 E3:q:3 C3:q:5 | F3:q:2 E3:q:3 D3:h:4 | G3:q:1 F3:q:2 E3:q:3 D3:q:4 | C3:w:5"
      },
      {
        page: 48, title: "Hợp âm Fa trưởng tay trái · Bài luyện \"Bình minh trên đồng\"", tempo: 72,
        rh: "@C E4:q:3 F4:q:4 G4:q:5 E4:q:3 | @F F4:h:4 A4:h:5 | @C G4:q:5 F4:q:4 E4:q:3 D4:q:2 | E4:w:3 | E4:q:3 F4:q:4 G4:q:5 E4:q:3 | @F F4:h:4 A4:h:5 | @G7 G4:q:5 E4:q:3 D4:h:2 | @C C4:w:1",
        lh: "C3+E3+G3:w:5+3+1 | C3+F3+A3:w:5+2+1 | C3+E3+G3:w:5+3+1 | C3+E3+G3:w | C3+E3+G3:w | C3+F3+A3:w:5+2+1 | B2+F3+G3:w:5+2+1 | C3+E3+G3:w:5+3+1"
      },
      {
        page: 49, title: "Hợp âm Fa trưởng tay phải · Hợp âm điệu valse", time: 3, tempo: 90,
        read: ["Điệu valse: tay trái chơi nốt trầm ở phách 1, tay phải chơi hợp âm ở phách 2 và 3: \"bùm – chát – chát\"."],
        rh: "@C r:q C4+E4+G4:q:1+3+5 C4+E4+G4:q | @F r:q C4+F4+A4:q:1+4+5 C4+F4+A4:q | @C r:q C4+E4+G4:q:1+3+5 C4+E4+G4:q | @F r:q C4+F4+A4:q:1+4+5 C4+F4+A4:q | @G7 r:q B3+F4+G4:q:1+4+5 B3+F4+G4:q | r:q B3+F4+G4:q B3+F4+G4:q | @C r:q C4+E4+G4:q:1+3+5 C4+E4+G4:q | C4+E4+G4:hd",
        lh: "C3:q:5 r:h | C3:q r:h | C3:q r:h | C3:q r:h | G3:q:1 r:h | G3:q r:h | C3:q:5 r:h | C3:hd:5"
      }
    ]
  },

  // ----------- Các chương sau: đã có trong mục lục, sẽ soạn tiếp -----------
  {
    title: "Vị trí Sol",
    lessons: [
      { page: 50, title: "Vị trí Sol · Quãng ở vị trí Sol", soon: true },
      { page: 51, title: "Bài nhạc ở vị trí Sol", soon: true },
      { page: 52, title: "Viết nhạc ở vị trí Sol", soon: true },
      { page: 53, title: "Quãng giai điệu & hòa âm ở vị trí Sol", soon: true },
      { page: 54, title: "Dấu thăng", soon: true },
      { page: 55, title: "Viết dấu thăng", soon: true },
      { page: 56, title: "Luyện cho các ngón đều nhau", soon: true },
      { page: 57, title: "Một cách luyện ngón tay (Leschetizky)", soon: true },
      { page: 58, title: "Hợp âm Sol trưởng & Rê 7 tay trái", soon: true },
      { page: 59, title: "Bài nhạc với G và D7", soon: true },
      { page: 60, title: "G & D7 tay phải · Hợp âm khối & hợp âm rải", soon: true },
      { page: 61, title: "Bàn đạp giữ tiếng (pedal)", soon: true },
      { page: 62, title: "Viết G & D7 tay trái · Liza Jane", soon: true },
      { page: 63, title: "Viết G & D7 tay phải", soon: true },
      { page: 64, title: "Nốt Mi tay trái · Vị trí mới của hợp âm Đô", soon: true },
      { page: 65, title: "Khởi động G, D7, C · Beautiful Brown Eyes", soon: true },
      { page: 66, title: "Viết nốt Mi tay trái", soon: true },
      { page: 67, title: "Viết hợp âm Đô vị trí mới (tay trái)", soon: true },
      { page: 68, title: "Nốt Mi tay phải · Hợp âm Đô vị trí mới tay phải", soon: true },
      { page: 69, title: "Khởi động G, D7, C (tay phải)", soon: true },
      { page: 70, title: "Viết nốt Mi tay phải", soon: true },
      { page: 71, title: "Viết hợp âm Đô vị trí mới (tay phải)", soon: true }
    ]
  },
  {
    title: "Vị trí Đô giữa",
    lessons: [
      { page: 72, title: "Vị trí Đô giữa", soon: true },
      { page: 73, title: "Crescendo, diminuendo · Nhịp valse", soon: true },
      { page: 74, title: "Dấu lưu (fermata) · Good Morning to You", soon: true },
      { page: 75, title: "Nốt móc đơn · Happy Birthday", soon: true },
      { page: 76, title: "Thêm về móc đơn · Shoo, Fly · Skip to My Lou", soon: true },
      { page: 77, title: "D.C. al Fine", soon: true },
      { page: 78, title: "Bài tập Hanon", soon: true },
      { page: 80, title: "Nốt đen chấm dôi", soon: true },
      { page: 82, title: "Alouette (dân ca Pháp)", soon: true }
    ]
  },
  {
    title: "Mở rộng vị trí 5 ngón",
    lessons: [
      { page: 83, title: "Quãng 6", soon: true },
      { page: 84, title: "Lavender's Blue (dân ca Anh)", soon: true },
      { page: 85, title: "Nhịp 2/4 · Kum-ba-yah", soon: true },
      { page: 86, title: "Viết quãng 6", soon: true },
      { page: 87, title: "Hanon với quãng 6", soon: true },
      { page: 88, title: "London Bridge · Michael, Row the Boat Ashore", soon: true },
      { page: 89, title: "Blow the Man Down", soon: true },
      { page: 90, title: "Di chuyển trên bàn phím bằng quãng 6", soon: true },
      { page: 91, title: "Staccato (nảy tiếng)", soon: true },
      { page: 92, title: "Quãng 7 và quãng 8", soon: true },
      { page: 93, title: "Viết quãng 7 và quãng 8", soon: true },
      { page: 94, title: "Bài luyện ôn tập", soon: true },
      { page: 95, title: "Lullaby (Brahms)", soon: true },
      { page: 96, title: "Dấu giáng", soon: true },
      { page: 97, title: "Viết dấu giáng", soon: true },
      { page: 98, title: "Cung và nửa cung", soon: true },
      { page: 99, title: "Viết cung và nửa cung · Tetrachord", soon: true }
    ]
  },
  {
    title: "Gam và hợp âm – giọng Đô trưởng",
    lessons: [
      { page: 100, title: "Gam trưởng · Gam Đô trưởng", soon: true },
      { page: 101, title: "Viết gam trưởng", soon: true },
      { page: 102, title: "Chơi gam Đô trưởng", soon: true },
      { page: 103, title: "Dấu ff · Joy to the World", soon: true },
      { page: 104, title: "Thêm về hợp âm", soon: true },
      { page: 105, title: "Cockles and Mussels (dân ca Ireland)", soon: true },
      { page: 106, title: "Hợp âm chính giọng Đô trưởng · Vòng hợp âm", soon: true },
      { page: 107, title: "Nhạc Blues", soon: true },
      { page: 108, title: "Hợp âm và vòng Blues · Dấu hoàn", soon: true },
      { page: 109, title: "Bài Blues", soon: true },
      { page: 110, title: "Vị trí mở rộng tay phải · On Top of Old Smoky", soon: true }
    ]
  },
  {
    title: "Giọng Sol trưởng",
    lessons: [
      { page: 112, title: "Gam Sol trưởng · Giọng Sol trưởng", soon: true },
      { page: 113, title: "Đổi ngón trên cùng một nốt · Can-Can (Offenbach)", soon: true },
      { page: 114, title: "Viết nhạc giọng Sol trưởng", soon: true },
      { page: 115, title: "Hợp âm chính giọng Sol trưởng", soon: true },
      { page: 116, title: "Nốt đảo phách", soon: true },
      { page: 117, title: "Gam Blues giọng Sol · Bài biểu diễn", soon: true }
    ]
  },
  {
    title: "Giọng Fa trưởng",
    lessons: [
      { page: 118, title: "Gam Fa trưởng", soon: true },
      { page: 119, title: "Dấu lặng móc đơn · Dấu nhấn · Little Brown Jug", soon: true },
      { page: 120, title: "Hợp âm chính giọng Fa trưởng · Chiapanecas", soon: true },
      { page: 122, title: "Viết nhạc giọng Fa trưởng", soon: true },
      { page: 123, title: "Auld Lang Syne", soon: true },
      { page: 124, title: "Kiểu bè trầm mới · O Sole Mio", soon: true },
      { page: 125, title: "Hợp âm rải", soon: true }
    ]
  },
  {
    title: "Giọng La thứ",
    lessons: [
      { page: 126, title: "Giọng La thứ · Gam La thứ hòa âm", soon: true },
      { page: 127, title: "Thêm về đảo phách · Jericho", soon: true },
      { page: 128, title: "Viết nhạc giọng La thứ", soon: true },
      { page: 129, title: "Vòng hợp âm La thứ", soon: true },
      { page: 130, title: "Pedal gối tiếng · Dấu mp · Greensleeves", soon: true },
      { page: 132, title: "Thêm về hợp âm ba · Hợp âm chính giọng La thứ", soon: true },
      { page: 133, title: "Go Down, Moses", soon: true }
    ]
  },
  {
    title: "Giọng Rê thứ",
    lessons: [
      { page: 134, title: "Giọng Rê thứ · Gam Rê thứ hòa âm", soon: true },
      { page: 135, title: "Dấu pp · Scarborough Fair", soon: true },
      { page: 136, title: "Hợp âm chính giọng Rê thứ", soon: true }
    ]
  },
  {
    title: "Ôn tập",
    lessons: [
      { page: 138, title: "He's Got the Whole World in His Hands", soon: true },
      { page: 140, title: "Khởi động tay trái · The Entertainer (S. Joplin)", soon: true },
      { page: 142, title: "Chùm ba móc đơn · Amazing Grace", soon: true },
      { page: 144, title: "Giấy chứng nhận hoàn thành", soon: true }
    ]
  }
];
