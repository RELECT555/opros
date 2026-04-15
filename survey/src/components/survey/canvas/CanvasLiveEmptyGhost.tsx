/** Короткая подсказка при пустом шаге — без лишнего макета «карточка в карточке». */
export function CanvasLiveEmptyGhost() {
  return (
    <div className="canvas-live-ghost-simple">
      <p className="canvas-live-ghost-simple__text">
        Здесь будет контент шага — таким же, как для респондента. Добавьте шаблон или блоки внизу.
      </p>
    </div>
  )
}
