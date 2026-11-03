import { useId, useMemo } from 'react'
import type { SurveyConfigData, SurveyConsentItem, ContactsBlockConfig, ContactsFieldPartial } from '../../domain/models'
import { mergeContactsBlockConfig, defaultConsentItemsForEditor } from '../../lib/contactsBlock'
import { QField } from './EditorFields'

interface Props {
  config: SurveyConfigData
  update: (change: (current: SurveyConfigData) => SurveyConfigData) => void
}

type ContactFieldKey = 'name' | 'phone' | 'email' | 'comment'

function contactsFieldRaw(cfg: ContactsBlockConfig | undefined, key: ContactFieldKey): ContactsFieldPartial | undefined {
  switch (key) {
    case 'name':
      return cfg?.name
    case 'phone':
      return cfg?.phone
    case 'email':
      return cfg?.email
    case 'comment':
      return cfg?.comment
    default:
      return undefined
  }
}

export function ContactsBlockEditor({ config, update }: Props) {
  const descriptionId = useId()
  const contactsResolved = useMemo(() => mergeContactsBlockConfig(config.contacts_block), [config.contacts_block])
  const consentListForEdit =
    config.contacts_block?.consents !== undefined
      ? config.contacts_block.consents
      : defaultConsentItemsForEditor()
  function patchConsents(next: SurveyConsentItem[]) {
    update(c => ({ ...c, contacts_block: { ...c.contacts_block, consents: next } }))
  }

  return (
      <div className="qed-welcome-card qed-contacts-admin">
        <div className="qed-welcome-left">
          <div className="qed-welcome-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 9a3 3 0 100-6 3 3 0 000 6zM3 16.5v-1.5A5.5 5.5 0 019.5 9.5h1A5.5 5.5 0 0116 15v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="qed-welcome-label">Блок контактов</p>
            <p className="qed-welcome-desc">Финальный шаг опроса (после вопросов): поля, тексты и согласия</p>
          </div>
          <label className={`qed-contacts-disable-toggle${config.contacts_block?.disabled ? ' qed-contacts-disable-toggle--on' : ''}`}>
            <span className={`qed-contacts-toggle-sw${config.contacts_block?.disabled ? ' qed-contacts-toggle-sw--on' : ''}`}>
              <span className="qed-contacts-toggle-knob" />
            </span>
            <input
              type="checkbox"
              checked={config.contacts_block?.disabled === true}
              onChange={e =>
                update(c => ({ ...c, contacts_block: { ...c.contacts_block, disabled: e.target.checked } }))
              }
            />
            <span className="qed-contacts-toggle-label">
              {config.contacts_block?.disabled ? 'Блок отключён' : 'Блок включён'}
            </span>
          </label>
        </div>
        <div className={`qed-welcome-fields qed-contacts-admin-fields${config.contacts_block?.disabled ? ' qed-contacts-admin-fields--hidden' : ''}`} aria-hidden={config.contacts_block?.disabled}>
          <div className="qed-field-row2">
            <QField
              label="Заголовок блока"
              value={config.contacts_block?.title ?? ''}
              onChange={v => update(c => ({ ...c, contacts_block: { ...c.contacts_block, title: v } }))}
            />
            <QField
              label="Подзаголовок"
              value={config.contacts_block?.subtitle ?? ''}
              onChange={v => update(c => ({ ...c, contacts_block: { ...c.contacts_block, subtitle: v } }))}
            />
          </div>
          <div className="qed-field-row2">
            <QField
              label="Бейдж шага (до заполнения)"
              value={config.contacts_block?.step_pill_label ?? ''}
              onChange={v => update(c => ({ ...c, contacts_block: { ...c.contacts_block, step_pill_label: v } }))}
            />
            <QField
              label="Бейдж (готово)"
              value={config.contacts_block?.step_pill_done_label ?? ''}
              onChange={v => update(c => ({ ...c, contacts_block: { ...c.contacts_block, step_pill_done_label: v } }))}
            />
          </div>
          <label className="qed-inline-check">
            <input
              type="checkbox"
              checked={config.contacts_block?.hide_email_when_token !== false}
              onChange={e =>
                update(c => ({
                  ...c,
                  contacts_block: { ...c.contacts_block, hide_email_when_token: e.target.checked },
                }))
              }
            />
            Скрывать поле email у респондентов с персональной ссылкой (если email уже известен)
          </label>

          <p className="qed-subsection-title">Поля</p>
          {(['name', 'phone', 'email', 'comment'] as const).map(key => {
            const f = contactsResolved.fields[key]
            const raw = contactsFieldRaw(config.contacts_block, key)
            const patchField = (patch: Partial<ContactsFieldPartial>) => {
              update(c => ({
                ...c,
                contacts_block: {
                  ...c.contacts_block,
                  [key]: { ...contactsFieldRaw(c.contacts_block, key), ...patch },
                },
              }))
            }
            return (
              <div key={key} className="qed-contacts-field-card">
                <div className="qed-contacts-field-head">
                  <label className="qed-inline-check">
                    <input type="checkbox" checked={f.enabled} onChange={e => patchField({ enabled: e.target.checked })} />
                    <strong>{key === 'name' ? 'Имя' : key === 'phone' ? 'Телефон' : key === 'email' ? 'Email' : 'Комментарий'}</strong>
                  </label>
                  {f.enabled ? (
                    <label className="qed-inline-check qed-inline-check--sm">
                      <input type="checkbox" checked={f.required} onChange={e => patchField({ required: e.target.checked })} />
                      Обязательное
                    </label>
                  ) : null}
                  {f.enabled && (key === 'email' || key === 'comment') && !f.required ? (
                    <label className="qed-inline-check qed-inline-check--sm">
                      <input
                        type="checkbox"
                        checked={f.showOptionalHint}
                        onChange={e => patchField({ show_optional_hint: e.target.checked })}
                      />
                      Пометка «необязательно»
                    </label>
                  ) : null}
                </div>
                {f.enabled ? (
                  <div className="qed-field-row2">
                    <QField label="Подпись" value={raw?.label ?? f.label} onChange={v => patchField({ label: v })} />
                    <QField label="Плейсхолдер" value={raw?.placeholder ?? f.placeholder} onChange={v => patchField({ placeholder: v })} />
                  </div>
                ) : null}
              </div>
            )
          })}

          <p className="qed-subsection-title">Согласия</p>
          <p className="qed-welcome-desc qed-contacts-consent-hint">
            Несколько галочек: для каждой — заголовок, пояснение и при необходимости ссылка (URL на политику или PDF). Пустой список — без галочек.
          </p>
          {consentListForEdit.map((consent, ci) => (
            <div key={`${consent.id}-${ci}`} className="qed-consent-card">
              <div className="qed-consent-card-head">
                <span className="qed-consent-num">{ci + 1}</span>
                <button
                  type="button"
                  className="adm-btn-danger qed-consent-remove"
                  onClick={() => patchConsents(consentListForEdit.filter((_, j) => j !== ci))}
                >
                  Удалить
                </button>
              </div>
              <QField
                label="Заголовок"
                value={consent.title}
                onChange={v => patchConsents(consentListForEdit.map((x, j) => (j === ci ? { ...x, title: v } : x)))}
              />
              <div className="qed-field">
                <label className="qed-field-label" htmlFor={`${descriptionId}-${ci}`}>Текст под заголовком</label>
                <textarea
                  id={`${descriptionId}-${ci}`}
                  className="qed-field-input qed-field-textarea"
                  rows={2}
                  value={consent.description}
                  onChange={e =>
                    patchConsents(consentListForEdit.map((x, j) => (j === ci ? { ...x, description: e.target.value } : x)))
                  }
                  placeholder="Например: Нажимая «Отправить», вы соглашаетесь с"
                />
              </div>
              <div className="qed-field-row2">
                <QField
                  label="Ссылка (URL PDF или страницы)"
                  value={consent.linkUrl ?? ''}
                  onChange={v =>
                    patchConsents(
                      consentListForEdit.map((x, j) => (j === ci ? { ...x, linkUrl: v.trim() || undefined } : x)),
                    )
                  }
                />
                <QField
                  label="Текст ссылки"
                  value={consent.linkLabel ?? ''}
                  onChange={v =>
                    patchConsents(
                      consentListForEdit.map((x, j) => (j === ci ? { ...x, linkLabel: v.trim() || undefined } : x)),
                    )
                  }
                />
              </div>
              <label className="qed-inline-check">
                <input
                  type="checkbox"
                  checked={consent.required !== false}
                  onChange={e =>
                    patchConsents(consentListForEdit.map((x, j) => (j === ci ? { ...x, required: e.target.checked } : x)))
                  }
                />
                Обязательно для отправки
              </label>
            </div>
          ))}
          <button
            type="button"
            className="qed-add-btn qed-add-consent"
            onClick={() => {
              const next: SurveyConsentItem[] = [
                ...consentListForEdit,
                {
                  id: `consent_${Date.now()}`,
                  title: 'Дополнительное согласие',
                  description: '',
                  required: true,
                },
              ]
              patchConsents(next)
            }}
          >
            + Добавить галочку согласия
          </button>

          <div className="qed-field-row2">
            <QField
              label="Кнопка: текст, если не все согласия"
              value={config.contacts_block?.submit_hint_need_consents ?? ''}
              onChange={v =>
                update(c => ({ ...c, contacts_block: { ...c.contacts_block, submit_hint_need_consents: v } }))
              }
            />
            <QField
              label="Кнопка: текст, если контакты не заполнены"
              value={config.contacts_block?.submit_hint_need_contacts ?? ''}
              onChange={v =>
                update(c => ({ ...c, contacts_block: { ...c.contacts_block, submit_hint_need_contacts: v } }))
              }
            />
          </div>
        </div>
      </div>
  )
}
