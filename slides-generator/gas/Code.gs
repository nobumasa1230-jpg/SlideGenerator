// ============================================================
// Google Slides Generator - GAS Web App
// JSON定義からスライドを自動生成する
// ============================================================

// デフォルトテーマ
var DEFAULT_THEME = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#0f3460',
  highlight: '#e94560',
  text: '#ffffff',
  textDark: '#333333',
  background: '#ffffff',
  lightBg: '#f5f5f5'
};

// スライドサイズ (points)
var W = 720;
var H = 405;

// ============================================================
// Web App エントリポイント
// ============================================================

function doGet(e) {
  try {
    var params = e.parameter;

    // チャンク方式の処理
    if (params.chunk) {
      return handleChunk(params);
    }

    // 通常方式: data パラメータからBase64デコード
    var data = params.data;
    if (!data) {
      return jsonResponse({ error: 'No data parameter provided' });
    }

    var jsonStr = Utilities.newBlob(Utilities.base64Decode(data)).getDataAsString();
    var config = JSON.parse(jsonStr);

    var result = generatePresentation(config);
    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

function doPost(e) {
  try {
    var config = JSON.parse(e.postData.contents);
    var result = generatePresentation(config);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

// ============================================================
// チャンク処理
// ============================================================

function handleChunk(params) {
  var sessionId = params.sessionId;
  var chunkIndex = parseInt(params.chunkIndex);
  var totalChunks = parseInt(params.totalChunks);
  var chunk = params.chunk;

  var props = PropertiesService.getScriptProperties();
  var key = 'chunk_' + sessionId + '_' + chunkIndex;
  props.setProperty(key, chunk);

  // 全チャンク揃ったか確認
  var allChunks = [];
  for (var i = 0; i < totalChunks; i++) {
    var ck = props.getProperty('chunk_' + sessionId + '_' + i);
    if (!ck) {
      return jsonResponse({ status: 'chunk_received', index: chunkIndex });
    }
    allChunks.push(ck);
  }

  // 全チャンク揃ったのでクリーンアップ & 処理
  for (var i = 0; i < totalChunks; i++) {
    props.deleteProperty('chunk_' + sessionId + '_' + i);
  }

  var fullData = allChunks.join('');
  var jsonStr = Utilities.newBlob(Utilities.base64Decode(fullData)).getDataAsString();
  var config = JSON.parse(jsonStr);

  var result = generatePresentation(config);
  return jsonResponse(result);
}

// ============================================================
// メイン生成関数
// ============================================================

function generatePresentation(config) {
  var theme = mergeTheme(config.theme);
  var presentation = SlidesApp.create(config.title || 'Untitled Presentation');
  var slides = config.slides || [];

  // デフォルトの空スライドを削除
  var defaultSlides = presentation.getSlides();
  if (defaultSlides.length > 0) {
    defaultSlides[0].remove();
  }

  // 各スライドを生成
  for (var i = 0; i < slides.length; i++) {
    var slideConfig = slides[i];
    var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);

    switch (slideConfig.type) {
      case 'title':     renderTitle(slide, slideConfig, theme); break;
      case 'section':   renderSection(slide, slideConfig, theme); break;
      case 'text':      renderText(slide, slideConfig, theme); break;
      case 'bullets':   renderBullets(slide, slideConfig, theme); break;
      case 'two_column': renderTwoColumn(slide, slideConfig, theme); break;
      case 'comparison': renderComparison(slide, slideConfig, theme); break;
      case 'image_text': renderImageText(slide, slideConfig, theme); break;
      case 'image_full': renderImageFull(slide, slideConfig, theme); break;
      case 'timeline':  renderTimeline(slide, slideConfig, theme); break;
      case 'process':   renderProcess(slide, slideConfig, theme); break;
      case 'cards':     renderCards(slide, slideConfig, theme); break;
      case 'stats':     renderStats(slide, slideConfig, theme); break;
      case 'quote':     renderQuote(slide, slideConfig, theme); break;
      case 'table':     renderTable(slide, slideConfig, theme); break;
      case 'checklist': renderChecklist(slide, slideConfig, theme); break;
      case 'closing':   renderClosing(slide, slideConfig, theme); break;
      default:
        renderText(slide, { title: 'Unknown Type', body: 'Type: ' + slideConfig.type }, theme);
    }

    // ロゴ挿入
    if (config.logo && config.logo.base64) {
      insertLogo(slide, config.logo);
    }
  }

  return {
    success: true,
    presentationId: presentation.getId(),
    url: presentation.getUrl(),
    slideCount: slides.length
  };
}

// ============================================================
// ヘルパー関数
// ============================================================

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function mergeTheme(custom) {
  var theme = {};
  for (var k in DEFAULT_THEME) {
    theme[k] = (custom && custom[k]) ? custom[k] : DEFAULT_THEME[k];
  }
  return theme;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 8) hex = hex.substring(2); // ARGB → RGB
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

function setShapeFill(shape, color) {
  shape.getFill().setSolidFill(color);
}

function setTextStyle(style, options) {
  if (options.color) style.setForegroundColor(options.color);
  if (options.size) style.setFontSize(options.size);
  if (options.bold) style.setBold(true);
  if (options.italic) style.setItalic(true);
  if (options.font) style.setFontFamily(options.font);
}

function addTextBox(slide, text, left, top, width, height, options) {
  options = options || {};
  var shape = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, left, top, width, height);
  var tf = shape.getText();
  tf.setText(text || '');

  if (options.align === 'center') {
    tf.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  } else if (options.align === 'right') {
    tf.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.RIGHT);
  }

  if (options.valign === 'middle') {
    shape.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  } else if (options.valign === 'bottom') {
    shape.setContentAlignment(SlidesApp.ContentAlignment.BOTTOM);
  }

  setTextStyle(tf.getTextStyle(), {
    color: options.color || '#333333',
    size: options.size || 14,
    bold: options.bold || false,
    font: options.font || 'Noto Sans JP'
  });

  return shape;
}

function addRect(slide, left, top, width, height, color) {
  var rect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, left, top, width, height);
  setShapeFill(rect, color);
  rect.getBorder().setTransparent();
  return rect;
}

function addLine(slide, startLeft, startTop, endLeft, endTop, color, weight) {
  var line = slide.insertLine(
    SlidesApp.LineCategory.STRAIGHT,
    startLeft, startTop, endLeft, endTop
  );
  line.getLineFill().setSolidFill(color);
  line.setWeight(weight || 2);
  return line;
}

function insertLogo(slide, logoConfig) {
  var blob = Utilities.newBlob(Utilities.base64Decode(logoConfig.base64), logoConfig.mimeType || 'image/png');
  var w = logoConfig.width || 45;
  var h = logoConfig.height || 45;
  var top = logoConfig.top || 8;
  var left = logoConfig.left || 660;
  slide.insertImage(blob, left, top, w, h);
}

function insertImageFromUrl(slide, url, left, top, width, height) {
  try {
    var image = slide.insertImage(url, left, top, width, height);
    return image;
  } catch (e) {
    // URLからの挿入失敗時はプレースホルダを表示
    addTextBox(slide, '[Image Load Error]', left, top, width, height, {
      color: '#999999', size: 12, align: 'center', valign: 'middle'
    });
    return null;
  }
}

function insertImageFromBase64(slide, base64, mimeType, left, top, width, height) {
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType || 'image/png');
  return slide.insertImage(blob, left, top, width, height);
}

// ============================================================
// スライドレンダラー (16種類)
// ============================================================

// 1. タイトルスライド
function renderTitle(slide, config, theme) {
  // 背景: グラデーション風の2色
  addRect(slide, 0, 0, W, H, theme.primary);
  addRect(slide, 0, H * 0.7, W, H * 0.3, theme.secondary);

  // アクセントライン
  addRect(slide, 60, H * 0.42, 120, 4, theme.highlight);

  // タイトル
  addTextBox(slide, config.title || '', 60, H * 0.15, W - 120, 100, {
    color: theme.text, size: 36, bold: true, align: 'left'
  });

  // サブタイトル
  if (config.subtitle) {
    addTextBox(slide, config.subtitle, 60, H * 0.48, W - 120, 50, {
      color: theme.text, size: 18, align: 'left'
    });
  }

  // 発表者・日付
  var footer = '';
  if (config.presenter) footer += config.presenter;
  if (config.date) footer += (footer ? '  |  ' : '') + config.date;
  if (footer) {
    addTextBox(slide, footer, 60, H * 0.78, W - 120, 40, {
      color: theme.text, size: 14, align: 'left'
    });
  }
}

// 2. セクション区切り
function renderSection(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.accent);

  // セクション番号
  if (config.number !== undefined) {
    addTextBox(slide, 'SECTION ' + config.number, 60, H * 0.25, W - 120, 40, {
      color: theme.highlight, size: 14, bold: true, align: 'left'
    });
  }

  addRect(slide, 60, H * 0.42, 80, 4, theme.highlight);

  addTextBox(slide, config.title || '', 60, H * 0.45, W - 120, 80, {
    color: theme.text, size: 32, bold: true, align: 'left'
  });

  if (config.subtitle) {
    addTextBox(slide, config.subtitle, 60, H * 0.68, W - 120, 40, {
      color: theme.text, size: 16, align: 'left'
    });
  }
}

// 3. テキスト
function renderText(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  addTextBox(slide, config.body || '', 40, 90, W - 80, H - 120, {
    color: theme.textDark, size: 14
  });
}

// 4. 箇条書き
function renderBullets(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  var items = config.items || [];
  var yStart = 90;
  var lineH = Math.min(35, (H - yStart - 20) / items.length);

  for (var i = 0; i < items.length; i++) {
    // ドット
    addRect(slide, 50, yStart + i * lineH + 7, 8, 8, theme.highlight);
    // テキスト
    addTextBox(slide, items[i], 70, yStart + i * lineH, W - 120, lineH, {
      color: theme.textDark, size: 14
    });
  }
}

// 5. 2カラム
function renderTwoColumn(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  var colW = (W - 100) / 2;
  var colLeft1 = 40;
  var colLeft2 = 40 + colW + 20;

  // 左カラム
  addRect(slide, colLeft1, 85, colW, H - 105, theme.lightBg);
  if (config.left_title) {
    addTextBox(slide, config.left_title, colLeft1 + 10, 92, colW - 20, 30, {
      color: theme.primary, size: 16, bold: true
    });
  }
  var leftItems = config.left || [];
  for (var i = 0; i < leftItems.length; i++) {
    addTextBox(slide, '  ' + leftItems[i], colLeft1 + 10, 125 + i * 30, colW - 20, 28, {
      color: theme.textDark, size: 12
    });
  }

  // 右カラム
  addRect(slide, colLeft2, 85, colW, H - 105, theme.lightBg);
  if (config.right_title) {
    addTextBox(slide, config.right_title, colLeft2 + 10, 92, colW - 20, 30, {
      color: theme.primary, size: 16, bold: true
    });
  }
  var rightItems = config.right || [];
  for (var i = 0; i < rightItems.length; i++) {
    addTextBox(slide, '  ' + rightItems[i], colLeft2 + 10, 125 + i * 30, colW - 20, 28, {
      color: theme.textDark, size: 12
    });
  }
}

// 6. 比較表
function renderComparison(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  var colW = (W - 110) / 2;

  // Option A
  addRect(slide, 40, 85, colW, 35, theme.primary);
  addTextBox(slide, config.option_a_title || 'A', 40, 85, colW, 35, {
    color: theme.text, size: 16, bold: true, align: 'center', valign: 'middle'
  });
  var aItems = config.option_a || [];
  for (var i = 0; i < aItems.length; i++) {
    addRect(slide, 50, 130 + i * 8, 6, 6, theme.highlight);
    addTextBox(slide, aItems[i], 65, 125 + i * 30, colW - 30, 28, {
      color: theme.textDark, size: 12
    });
  }

  // Option B
  addRect(slide, 40 + colW + 30, 85, colW, 35, theme.accent);
  addTextBox(slide, config.option_b_title || 'B', 40 + colW + 30, 85, colW, 35, {
    color: theme.text, size: 16, bold: true, align: 'center', valign: 'middle'
  });
  var bItems = config.option_b || [];
  for (var i = 0; i < bItems.length; i++) {
    addRect(slide, 50 + colW + 30, 130 + i * 8, 6, 6, theme.highlight);
    addTextBox(slide, bItems[i], 65 + colW + 30, 125 + i * 30, colW - 30, 28, {
      color: theme.textDark, size: 12
    });
  }
}

// 7. 画像+テキスト
function renderImageText(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  // 左: 画像
  var imgW = 280;
  var imgH = 280;
  var imgLeft = 40;
  var imgTop = 90;

  if (config.image_base64) {
    insertImageFromBase64(slide, config.image_base64, config.image_mime || 'image/png',
      imgLeft, imgTop, imgW, imgH);
  } else if (config.image_url) {
    insertImageFromUrl(slide, config.image_url, imgLeft, imgTop, imgW, imgH);
  } else {
    addRect(slide, imgLeft, imgTop, imgW, imgH, theme.lightBg);
    addTextBox(slide, '[No Image]', imgLeft, imgTop + imgH / 2 - 15, imgW, 30, {
      color: '#999999', size: 12, align: 'center'
    });
  }

  if (config.image_caption) {
    addTextBox(slide, config.image_caption, imgLeft, imgTop + imgH + 2, imgW, 20, {
      color: '#999999', size: 10, align: 'center'
    });
  }

  // 右: テキスト
  addTextBox(slide, config.body || '', 340, 90, W - 380, H - 120, {
    color: theme.textDark, size: 13
  });
}

// 8. 画像全面表示 (16:9 ワイドスクリーン)
function renderImageFull(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.primary);

  // 画像をスライド全面に表示 (720x405)
  if (config.image_base64) {
    insertImageFromBase64(slide, config.image_base64, config.image_mime || 'image/png',
      0, 0, W, H);
  } else if (config.image_url) {
    insertImageFromUrl(slide, config.image_url, 0, 0, W, H);
  } else {
    addRect(slide, 0, 0, W, H, theme.secondary);
    addTextBox(slide, '[No Image]', 0, H / 2 - 15, W, 30, {
      color: '#999999', size: 14, align: 'center'
    });
  }

  // 下部に半透明風バー（タイトル・キャプションがある場合のみ）
  if (config.title || config.caption) {
    addRect(slide, 0, H - 60, W, 60, theme.primary);

    if (config.title) {
      addTextBox(slide, config.title, 40, H - 58, W - 80, 30, {
        color: theme.text, size: 14, bold: true, align: 'center'
      });
    }

    if (config.caption) {
      addTextBox(slide, config.caption, 40, H - 30, W - 80, 22, {
        color: '#aaaaaa', size: 10, align: 'center'
      });
    }
  }
}

// 9. タイムライン
function renderTimeline(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  var items = config.items || [];
  var n = items.length;
  if (n === 0) return;

  var lineY = 170;
  var startX = 60;
  var endX = W - 60;
  var segW = (endX - startX) / (n - 1 || 1);

  // 横ライン
  addRect(slide, startX, lineY, endX - startX, 3, theme.accent);

  for (var i = 0; i < n; i++) {
    var cx = (n === 1) ? W / 2 : startX + i * segW;

    // ドット
    var dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 8, lineY - 6, 16, 16);
    setShapeFill(dot, theme.highlight);
    dot.getBorder().setTransparent();

    // ラベル
    addTextBox(slide, items[i].label || '', cx - 50, lineY - 45, 100, 30, {
      color: theme.primary, size: 13, bold: true, align: 'center'
    });

    // 説明
    addTextBox(slide, items[i].description || '', cx - 60, lineY + 20, 120, 60, {
      color: theme.textDark, size: 11, align: 'center'
    });
  }
}

// 10. プロセス図
function renderProcess(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  var steps = config.steps || [];
  var n = steps.length;
  if (n === 0) return;

  var boxW = Math.min(140, (W - 80 - (n - 1) * 20) / n);
  var totalW = n * boxW + (n - 1) * 20;
  var startX = (W - totalW) / 2;
  var boxH = 80;
  var topY = 130;

  for (var i = 0; i < n; i++) {
    var x = startX + i * (boxW + 20);

    // ステップ番号バッジ
    var badge = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + boxW / 2 - 12, topY - 12, 24, 24);
    setShapeFill(badge, theme.highlight);
    badge.getBorder().setTransparent();
    var badgeText = badge.getText();
    badgeText.setText(String(i + 1));
    setTextStyle(badgeText.getTextStyle(), { color: '#ffffff', size: 11, bold: true });
    badgeText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // ボックス
    addRect(slide, x, topY + 18, boxW, boxH, theme.lightBg);

    // タイトル
    addTextBox(slide, steps[i].title || '', x + 5, topY + 22, boxW - 10, 25, {
      color: theme.primary, size: 12, bold: true, align: 'center'
    });

    // 説明
    addTextBox(slide, steps[i].description || '', x + 5, topY + 48, boxW - 10, 45, {
      color: theme.textDark, size: 10, align: 'center'
    });

    // 矢印
    if (i < n - 1) {
      addTextBox(slide, '\u25B6', x + boxW + 3, topY + 40, 14, 20, {
        color: theme.highlight, size: 14, align: 'center'
      });
    }
  }
}

// 11. カード型
function renderCards(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  var cards = config.cards || [];
  var n = cards.length;
  if (n === 0) return;

  var cols = Math.min(n, 4);
  var rows = Math.ceil(n / cols);
  var cardW = (W - 80 - (cols - 1) * 15) / cols;
  var cardH = Math.min(110, (H - 100 - (rows - 1) * 10) / rows);
  var startY = 90;

  for (var i = 0; i < n; i++) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var x = 40 + col * (cardW + 15);
    var y = startY + row * (cardH + 10);

    addRect(slide, x, y, cardW, cardH, theme.lightBg);

    // アイコン
    if (cards[i].icon) {
      addTextBox(slide, cards[i].icon, x + 5, y + 5, cardW - 10, 30, {
        size: 22, align: 'center'
      });
    }

    // タイトル
    addTextBox(slide, cards[i].title || '', x + 5, y + 35, cardW - 10, 25, {
      color: theme.primary, size: 12, bold: true, align: 'center'
    });

    // 説明
    addTextBox(slide, cards[i].description || '', x + 5, y + 58, cardW - 10, 40, {
      color: theme.textDark, size: 10, align: 'center'
    });
  }
}

// 12. 数値ハイライト
function renderStats(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.primary);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.text, size: 24, bold: true, align: 'center'
  });

  addRect(slide, W / 2 - 30, 72, 60, 3, theme.highlight);

  var stats = config.stats || [];
  var n = stats.length;
  if (n === 0) return;

  var colW = (W - 80) / n;
  var topY = 110;

  for (var i = 0; i < n; i++) {
    var cx = 40 + i * colW + colW / 2;

    // 値
    addTextBox(slide, stats[i].value || '', cx - colW / 2 + 5, topY, colW - 10, 80, {
      color: theme.highlight, size: 44, bold: true, align: 'center'
    });

    // ラベル
    addTextBox(slide, stats[i].label || '', cx - colW / 2 + 5, topY + 80, colW - 10, 30, {
      color: theme.text, size: 16, bold: true, align: 'center'
    });

    // 説明
    if (stats[i].description) {
      addTextBox(slide, stats[i].description, cx - colW / 2 + 5, topY + 110, colW - 10, 25, {
        color: '#aaaaaa', size: 12, align: 'center'
      });
    }
  }
}

// 13. 引用
function renderQuote(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.lightBg);

  // 大きな引用符
  addTextBox(slide, '\u201C', 50, 60, 80, 100, {
    color: theme.highlight, size: 72, bold: true
  });

  // 引用文
  addTextBox(slide, config.quote || '', 80, 120, W - 160, 150, {
    color: theme.textDark, size: 20, italic: true, align: 'center'
  });

  // 発言者
  if (config.author) {
    addTextBox(slide, '\u2014 ' + config.author, 80, 280, W - 160, 30, {
      color: theme.primary, size: 16, bold: true, align: 'center'
    });
  }

  // 出典
  if (config.source) {
    addTextBox(slide, config.source, 80, 310, W - 160, 25, {
      color: '#999999', size: 12, align: 'center'
    });
  }
}

// 14. テーブル
function renderTable(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  var headers = config.headers || [];
  var rows = config.rows || [];
  var numCols = headers.length;
  var numRows = rows.length;
  if (numCols === 0) return;

  var tableLeft = 40;
  var tableTop = 90;
  var tableW = W - 80;
  var rowH = Math.min(30, (H - tableTop - 20) / (numRows + 1));
  var colW = tableW / numCols;

  // ヘッダー行
  addRect(slide, tableLeft, tableTop, tableW, rowH, theme.primary);
  for (var c = 0; c < numCols; c++) {
    addTextBox(slide, headers[c] || '', tableLeft + c * colW, tableTop, colW, rowH, {
      color: theme.text, size: 11, bold: true, align: 'center', valign: 'middle'
    });
  }

  // データ行
  for (var r = 0; r < numRows; r++) {
    var y = tableTop + (r + 1) * rowH;
    var bgColor = (r % 2 === 0) ? theme.background : theme.lightBg;
    addRect(slide, tableLeft, y, tableW, rowH, bgColor);

    for (var c = 0; c < numCols; c++) {
      var cellVal = (rows[r] && rows[r][c]) ? rows[r][c] : '';
      addTextBox(slide, cellVal, tableLeft + c * colW, y, colW, rowH, {
        color: theme.textDark, size: 11, align: 'center', valign: 'middle'
      });
    }
  }

  // テーブル枠線
  addLine(slide, tableLeft, tableTop, tableLeft + tableW, tableTop, '#dddddd', 1);
  addLine(slide, tableLeft, tableTop + (numRows + 1) * rowH, tableLeft + tableW, tableTop + (numRows + 1) * rowH, '#dddddd', 1);
}

// 15. チェックリスト
function renderChecklist(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.background);
  addRect(slide, 0, 0, W, 6, theme.highlight);

  addTextBox(slide, config.title || '', 40, 25, W - 80, 45, {
    color: theme.textDark, size: 24, bold: true
  });

  addRect(slide, 40, 72, 60, 3, theme.highlight);

  var items = config.items || [];
  var yStart = 90;
  var lineH = Math.min(35, (H - yStart - 20) / items.length);

  for (var i = 0; i < items.length; i++) {
    var y = yStart + i * lineH;
    var checked = items[i].checked;

    // チェックボックス
    var boxSize = 16;
    var box = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, y + 5, boxSize, boxSize);
    box.getBorder().getLineFill().setSolidFill(theme.accent);
    box.getBorder().setWeight(1.5);

    if (checked) {
      setShapeFill(box, theme.highlight);
      var check = box.getText();
      check.setText('\u2713');
      setTextStyle(check.getTextStyle(), { color: '#ffffff', size: 10, bold: true });
      check.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    } else {
      box.getFill().setTransparent();
    }

    // テキスト
    var textColor = checked ? theme.textDark : '#999999';
    addTextBox(slide, items[i].text || '', 75, y, W - 130, lineH, {
      color: textColor, size: 14
    });
  }
}

// 16. クロージング
function renderClosing(slide, config, theme) {
  addRect(slide, 0, 0, W, H, theme.primary);
  addRect(slide, 0, H * 0.75, W, H * 0.25, theme.secondary);

  addTextBox(slide, config.title || 'Thank You', 60, H * 0.2, W - 120, 80, {
    color: theme.text, size: 36, bold: true, align: 'center'
  });

  addRect(slide, W / 2 - 40, H * 0.48, 80, 3, theme.highlight);

  if (config.message) {
    addTextBox(slide, config.message, 60, H * 0.52, W - 120, 40, {
      color: theme.text, size: 16, align: 'center'
    });
  }

  var contactInfo = '';
  if (config.contact) contactInfo += config.contact;
  if (config.website) contactInfo += (contactInfo ? '\n' : '') + config.website;
  if (contactInfo) {
    addTextBox(slide, contactInfo, 60, H * 0.8, W - 120, 50, {
      color: theme.text, size: 13, align: 'center'
    });
  }
}

// ============================================================
// テスト関数
// ============================================================

function testGenerate() {
  var config = {
    title: 'テストプレゼンテーション',
    slides: [
      {
        type: 'title',
        title: 'テストプレゼンテーション',
        subtitle: '自動生成システムのテスト',
        presenter: 'テスト太郎',
        date: '2026年4月'
      },
      {
        type: 'bullets',
        title: 'テスト項目',
        items: ['項目A', '項目B', '項目C']
      },
      {
        type: 'stats',
        title: '成果指標',
        stats: [
          { value: '95%', label: '達成率', description: '目標比' },
          { value: '3x', label: '効率化', description: '前年比' },
          { value: '42', label: '実施件数', description: '年間' }
        ]
      },
      {
        type: 'closing',
        title: 'ありがとうございました',
        message: 'ご質問はお気軽にどうぞ'
      }
    ]
  };

  var result = generatePresentation(config);
  Logger.log('URL: ' + result.url);
  Logger.log('Slides: ' + result.slideCount);
}
