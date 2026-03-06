import { useMemo, useState } from "react";
import { validateDeploymentName, validateEmail } from "@/utils/validation";

export type Metadata = {
  deploymentName: string;
  description: string;
  userName: string;
  email: string;
  phone: string;
};

type Props = {
  value: Metadata;
  onChange: (value: Metadata, valid: boolean) => void;
};

export default function MetadataForm({ value, onChange }: Props) {
  const [deploymentTouched, setDeploymentTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const deploymentNameError = useMemo(() => validateDeploymentName(value.deploymentName), [value.deploymentName]);
  const emailError = useMemo(() => validateEmail(value.email), [value.email]);
  const showDeploymentError = deploymentTouched && Boolean(deploymentNameError);
  const showEmailError = emailTouched && Boolean(emailError);

  function update<K extends keyof Metadata>(key: K, nextValue: string) {
    const next = { ...value, [key]: nextValue };
    onChange(next, !validateDeploymentName(next.deploymentName) && !validateEmail(next.email));
  }

  return (
    <section className="metadata-form">
      <label className="metadata-form__field" htmlFor="deploymentName">
        <span className="metadata-form__label-row">
          <span>Deployment Name</span>
          {showDeploymentError ? (
            <span className="metadata-form__invalid-indicator" role="alert">
              <calcite-icon icon="x-circle-f" scale="s" aria-hidden="true" />
              {deploymentNameError}
            </span>
          ) : null}
        </span>
        <input
          id="deploymentName"
          name="deploymentName"
          value={value.deploymentName}
          maxLength={100}
          className={`metadata-form__input ${showDeploymentError ? "is-invalid" : ""}`}
          onBlur={() => setDeploymentTouched(true)}
          onChange={(event) => update("deploymentName", event.target.value)}
        />
      </label>

      <label className="metadata-form__field" htmlFor="description">
        Description
        <textarea
          id="description"
          value={value.description}
          maxLength={300}
          rows={3}
          className="metadata-form__input metadata-form__textarea"
          onChange={(event) => update("description", event.target.value)}
        />
      </label>

      <div className="metadata-form__row">
        <label className="metadata-form__field" htmlFor="userName">
          Contact Name
          <input
            id="userName"
            value={value.userName}
            className="metadata-form__input"
            onChange={(event) => update("userName", event.target.value)}
          />
        </label>

        <label className="metadata-form__field" htmlFor="email">
          <span className="metadata-form__label-row">
            <span>Email</span>
            {showEmailError ? (
              <span className="metadata-form__invalid-indicator" role="alert">
                <calcite-icon icon="x-circle-f" scale="s" aria-hidden="true" />
                {emailError}
              </span>
            ) : null}
          </span>
          <input
            id="email"
            type="email"
            value={value.email}
            className={`metadata-form__input ${showEmailError ? "is-invalid" : ""}`}
            onBlur={() => setEmailTouched(true)}
            onChange={(event) => update("email", event.target.value)}
          />
        </label>

        <label className="metadata-form__field" htmlFor="phone">
          Phone
          <input
            id="phone"
            value={value.phone}
            className="metadata-form__input"
            onChange={(event) => update("phone", event.target.value)}
          />
        </label>
      </div>

    </section>
  );
}
