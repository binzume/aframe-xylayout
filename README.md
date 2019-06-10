# A-Frame xyLayout

Simple 2D layout components for [A-Frame](https://aframe.io/).

## Examples

- [Layout](https://binzume.github.io/aframe-xylayout/examples/layout.html)
- [Window UI](https://binzume.github.io/aframe-xylayout/examples/window.html)

![Layout example](./examples/layout.png)

## Primitives

T.B.D.

- a-xylayout
- a-xyscroll

- a-xywindow
- a-xybutton
- a-xyrange

## Components

CSS Flexbox を意識した仕様になっていますが，あまり Flexible ではありません．

### xycontainer

レイアウトのコンテナ．

Attributes

| name | desc | values |
| ---- | ---- | ---- |
| direction    | レイアウト方向 |'vertical', 'horizontal'|
| justifyItems | レイアウト方向の小要素の挙動 |'', 'center', 'start', 'end', 'space-between', 'space-around', 'stretch'|
| alignItems   | レイアウトに対し垂直方向の小要素の挙動 |'', 'center', 'start', 'end', 'stretch'|
| spacing      | レイアウト間隔 | number |
| padding      | 上下左右の余白 | number |

### xyitem

親のxycontainerで指定された値を要素ごとに上書くためのコンポーネント．
xycontainer直下以外の要素以外に追加した場合は何も起きません．

Attributes

| name | type | desc |
| ---- | ---- | ---- |
| align  | align | alignItems参照 |
| grow  | number | stretchで拡張される量 |
| shrink  | number | stretchで縮小される量 |
| fixed | boolean | trueに設定するとレイアウト時に無視されます |

### xyrect

xycontainerは要素のwidth,height属性を見ますが，width,heightからサイズがわからないもの(a-sphereなど)や，
原点が中心ではないオブジェクトに対してサイズを明示するためのコンポーネント．

| name | type | desc |
| ---- | ---- | ---- |
| width  | number | 要素の幅を明示．無指定時(-1)は要素のwidth属性を使います |
| height | number | 要素の高さを明示．無指定時(-1)は要素のheight属性を使います |
| pivotX | number | 要素の原点の位置  (default:0.5) |
| pivotY | number | 要素の原点の位置  (default:0.5) |

pivotは，左下が(0,0)です．a-frame のほとんどの要素は中心 (0.5, 0.5) が原点です．

### xyclipping

表示をクリッピングするためのコンポーネント．xyscrollで使用．

小要素のサイズが親要素をはみ出す場合にレンダリング時にクリッピングされます．

| name | type | desc |
| ---- | ---- | ---- |
| clipTop    | boolean  | 上部をクリッピングします (default:true) |
| clipBottom | boolean  | 下部をクリッピングします (default:true) |
| clipLeft   | boolean  | 左側をクリッピングします |
| clipRight  | boolean  | 右側をクリッピングします |
| exclude    | selector | クリッピングから除外する要素 |

THREE.js標準のシェーダを使っている場合のみ正しく動きます．例えばa-textはシェーダが専用のものなので正しくクリッピングされません．

### xyscroll

スクロールを管理するコンポーネント．
小要素の高さがはみ出す場合にスクロールバーによるスクロールができるようにします．横スクロールは未対応です．

このコンポーネントだけは，要素の中心ではなく左下を原点として扱います．

| name | type | desc |
| ---- | ---- | ---- |
| scrollbar | boolean  | スクロールバーを表示 (default:true) |

### xywindow

| name | type | desc |
| ---- | ---- | ---- |
| title    | string  | ウィンドウタイトル |
| closable | boolean  | 閉じるボタンの表示 (default:true) |

### xybutton

| name | type | desc |
| ---- | ---- | ---- |
| label | string  | ボタンのラベル |

### xyrange

| name | type | desc |
| ---- | ---- | ---- |
| min   | number | 最小値 |
| max   | number | 最大値 |
| value | number | 初期値 |
| step  | number | 変化の単位 |
| thumbSize | number | つまみサイズ |

### xylist

リスト．いわゆるRecyclerViewです．
