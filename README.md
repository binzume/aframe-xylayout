# A-Frame xyLayout [WIP]

Flexbox like layout + UI components for [A-Frame](https://aframe.io/).

## Examples

[Layout](https://binzume.github.io/aframe-xylayout/examples/layout.html)

![Layout example](./examples/layout.png)

[UI Components](https://binzume.github.io/aframe-xylayout/examples/window.html)

![UI example](./examples/ui.png)


[Software keyboard](https://binzume.github.io/aframe-xylayout/examples/keyboard.html) [WIP]

## Usage

Use [xylayout-all.min.js](./dist/xylayout-all.min.js) (30kB)

```html
<script src="https://binzume.github.io/aframe-xylayout/dist/xylayout-all.min.js"></script>
...
<a-xycontainer direction="column" spacing="0.1" padding="0.2">
    <a-xylabel value="ABC123漢字" width="2" height="0.5"></a-xylabel>
    <a-xybutton label="Button"></a-xybutton>
    <a-xyselect values="abc,123,Foo,Bar" select="1"></a-xyselect>
    <a-xytoggle value="true"></a-xytoggle>
    <a-xyrange width="4" height="0.5" value="20"></a-xyrange>
    <a-xycontainer direction="row" spacing="0.2">
        <a-box color="blue"></a-box>
        <a-box color="red"></a-box>
        <a-box color="green"></a-box>
    </a-xycontainer>
</a-xycontainer>
```

Building xylayout-all.min.js

```bash
npm install
npm run dist
```

## Primitives

T.B.D. (See [examples](./examples))

- a-xycontainer
- a-xywindow
- a-xylabel
- a-xybutton
- a-xyrange
- a-xytoggle
- a-xyselect
- a-xyscroll

それぞれ同名のコンポーネント + `xyrect`コンポーネントが使われます．

## Components

### xycontainer

3Dオブジェクトを平面上に配置するコンテナ．
[CSS Flexbox](https://developer.mozilla.org/ja/docs/Web/CSS/CSS_Flexible_Box_Layout) と同様のレイアウトができますが挙動は少し異なります．

Attributes:

| name | default | desc | values |
| ---- | ------- | ---- | ------ |
| direction    | column | レイアウト方向 | 'row', 'column' ('horizontal', 'vertical') |
| justifyItems | start  | レイアウト方向の小要素の配置 | 'center', 'start', 'end', 'space-between', 'space-around', 'stretch'|
| alignItems   | none   | レイアウトに対し垂直方向の小要素の配置 |'none', 'center', 'start', 'end', 'stretch'|
| alignContent | none   | wrapで折り返した時の各行の配置 |'none', 'center', 'start', 'end', 'stretch'|
| spacing      | 0.05   | レイアウト間隔 | number |
| padding      | 0      | 上下左右の余白 | number |
| wrap         | nowrap | 折返し | wrap, nowrap |
| reverse      | false  | 逆向きにレイアウト |  |

### xyitem

親のxycontainerで指定された値を要素ごとに上書くためのコンポーネント．
親要素がxycontainerではない場合は追加しても何も起きません．

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| align  | align   | none  | alignItems参照 |
| grow   | number  | 1     | stretchで拡張される量 |
| shrink | number  | 1     | stretchで縮小される量 |
| fixed  | boolean | false | trueに設定するとレイアウト時に無視されます |

### xyrect

xycontainerは要素のwidth,height属性を見ますが，width,heightからサイズがわからないもの(a-sphereなど)や，
原点が中心ではないオブジェクトに対してサイズを明示するためのコンポーネント．

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| width  | number | -1  | 要素の幅を明示．無指定時(-1)は要素のwidth属性を使います |
| height | number | -1  | 要素の高さを明示．無指定時(-1)は要素のheight属性を使います |
| pivotX | number | 0.5 | 要素の原点の位置 |
| pivotY | number | 0.5 | 要素の原点の位置 |

pivotは，左下が(0,0)です．a-frame のほとんどの要素は中心 (0.5, 0.5) が原点です．

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| xyresize | {xyrect} | Resize event |

### xywindow

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| title    | string   |      | ウィンドウタイトル |
| closable | boolean  | true | 閉じるボタンの表示 |

### xylabel

textコンポーネントのWrappper．
マルチバイト文字が含まれる場合はCanvasでのレンダリングにフォールバックします．

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| value         | string |      | テキスト |
| renderingMode | string | auto | canvas: 常にcanvasでレンダリングする, auto: 可能ならtextコンポーネントを使う |
| resolution    | number | 32   | canvasを使う場合の高さ方向の解像度 |

上記以外のパラメータはtextコンポーネントを参照．

### xybutton

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| label | string | | ボタンのラベル |
| color | color | | ボタンの色 |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| click |   | Click event |

### xytoggle

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| value | boolean | false | トグルスイッチの状態 |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| change | {value} | changed event |

### xyrange

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| min   | number | 0   | 最小値 |
| max   | number | 100 | 最大値 |
| value | number | 0   | 初期値 |
| step  | number | 0   | 変化の単位 |
| thumbSize | number | 0.4 | つまみサイズ |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| change | {value} | changed event |

### xyselect

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| values | array | []    | 選択肢 |
| select | int   | 0     | 選択されているインデックス |
| toggle | boolean | false | トグルモード |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| select | {value, index} | changed event |

### xylist

リスト．RecyclerView です．xyscrollの子要素で使う前提の実装です．
`xylist.setCallback()`, `xylist.setContents()` を呼ぶ必要があります．
[サンプル](https://binzume.github.io/aframe-xylayout/examples/list.html)

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| itemWidth  | number | -1 | アイテムの幅 |
| itemHeight | number | -1 | アイテムの高さ |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| clickitem | {index} | click item event |

### xyclipping

表示をクリッピングするためのコンポーネント．xyscrollで使用．

小要素のサイズが親要素をはみ出す場合にレンダリング時にクリッピングされます．

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| clipTop    | boolean  | true  | 上部をクリッピングします |
| clipBottom | boolean  | true  | 下部をクリッピングします |
| clipLeft   | boolean  | false | 左側をクリッピングします |
| clipRight  | boolean  | false | 右側をクリッピングします |
| exclude    | selector |       | クリッピングから除外する要素 |

THREE.js標準のシェーダを使っている場合のみ正しく動きます．例えばa-textはシェーダが専用のものなので正しくクリッピングされません．

### xyscroll

スクロールを管理するコンポーネント．
小要素の高さがはみ出す場合にスクロールバーによるスクロールができるようにします．横スクロールは未対応です．

このコンポーネントだけは，要素の中心ではなく左下を原点として扱います．

Attributes:

| name | type | default | desc |
| ---- | ---- | ------- | ---- |
| scrollbar | boolean | true | スクロールバーを表示 |

Events:

| name | event.detail | desc |
| ---- | ------------ | ---- |
| xyviewport | [t, b, l, r]| viewport change event |

# License

MIT License
