import { CHARACTER_OPTIONS } from "./WalkCharacter";
import { useLayoutStore } from "../../store/layoutStore";

export function CharacterSelect() {
  const characterId = useLayoutStore((s) => s.characterId);
  const setCharacterId = useLayoutStore((s) => s.setCharacterId);

  return (
    <div className="sh-character-select">
      {CHARACTER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`sh-character-select__option${opt.id === characterId ? " sh-character-select__option--active" : ""}`}
          style={{ borderColor: opt.bodyColor }}
          onClick={() => setCharacterId(opt.id)}
          title={opt.label}
        >
          <span className="sh-character-select__swatch" style={{ background: opt.bodyColor }} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
