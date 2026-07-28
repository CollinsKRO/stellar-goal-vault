import { FormEvent, useEffect, useState } from 'react';
import { ApiError, CreateCampaignPayload } from '../types/campaign';
import { FormErrors, isFormValid, validateForm } from '../utils/validation';

interface CreateCampaignFormProps {
  onCreate: (payload: CreateCampaignPayload) => Promise<void>;
  allowedAssets?: string[];
  apiError?: ApiError | null;
}

const INITIAL_VALUES = {
  creator: '',
  title: '',
  description: '',
  acceptedTokens: ['USDC'],
  targetAmount: '250',
  deadlineHours: '72',
  imageUrl: '',
  imageFile: null as File | null,
  imagePreview: '',
  externalLink: '',
};

export function CreateCampaignForm({
  onCreate,
  allowedAssets = [],
  apiError,
}: CreateCampaignFormProps) {
  const assetOptions = allowedAssets.length > 0 ? allowedAssets : ['USDC'];
  const [values, setValues] = useState({
    ...INITIAL_VALUES,
    acceptedTokens: assetOptions.slice(0, 1),
  });
  const [validationErrors, setValidationErrors] = useState<FormErrors>(
    validateForm({ ...INITIAL_VALUES, acceptedTokens: assetOptions.slice(0, 1) }),
  );
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState<string>('');

  useEffect(() => {
    setValues((current) => {
      const validTokens = current.acceptedTokens.filter((token) => assetOptions.includes(token));
      if (validTokens.length === current.acceptedTokens.length && validTokens.length > 0) {
        return current;
      }

      return {
        ...current,
        acceptedTokens: validTokens.length > 0 ? validTokens : assetOptions.slice(0, 1),
      };
    });
  }, [assetOptions]);

  function update(field: keyof typeof INITIAL_VALUES, value: unknown) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (touchedFields.has(field)) {
      setValidationErrors(validateForm(nextValues));
    }
  }

  function handleFieldBlur(field: string) {
    const newTouched = new Set(touchedFields);
    newTouched.add(field);
    setTouchedFields(newTouched);
    setValidationErrors(validateForm(values));
  }

  function toggleToken(token: string) {
    const nextTokens = values.acceptedTokens.includes(token)
      ? values.acceptedTokens.filter((t) => t !== token)
      : [...values.acceptedTokens, token];

    update('acceptedTokens', nextTokens);
  }

  function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError('');

    if (!file) {
      update('imageFile', null);
      update('imagePreview', '');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Only JPG and PNG images are allowed');
      event.target.value = '';
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      setImageError('Image must be smaller than 2MB');
      event.target.value = '';
      return;
    }

    // Convert to base64 and create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      update('imageFile', file);
      update('imagePreview', base64String);
    };
    reader.onerror = () => {
      setImageError('Failed to read image file');
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    update('imageFile', null);
    update('imagePreview', '');
    update('imageUrl', '');
    setImageError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateForm(values);
    setValidationErrors(errors);
    if (!isFormValid(errors)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const deadline = Math.floor(Date.now() / 1000) + Number(values.deadlineHours) * 3600;

      // Use uploaded image (base64) if available, otherwise fall back to URL
      const finalImageUrl = values.imagePreview || values.imageUrl.trim() || undefined;

      await onCreate({
        creator: values.creator.trim(),
        title: values.title.trim(),
        description: values.description.trim(),
        acceptedTokens: values.acceptedTokens.map((t) => t.trim().toUpperCase()),
        targetAmount: Number(values.targetAmount),
        deadline,
        metadata: {
          imageUrl: finalImageUrl,
          externalLink: values.externalLink.trim() || undefined,
        },
      });

      const resetValues = {
        ...INITIAL_VALUES,
        acceptedTokens: assetOptions.slice(0, 1),
      };
      setValues(resetValues);
      setValidationErrors(validateForm(resetValues));
      setImageError('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card">
      <div className="section-heading">
        <h2>Create Campaign</h2>
        <p className="muted">
          Spin up a Stellar goal vault for contributors and prototype the funding lifecycle.
        </p>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field-group">
          <span>Creator account</span>
          <input
            type="text"
            value={values.creator}
            onChange={(event) => update('creator', event.target.value)}
            onBlur={() => handleFieldBlur('creator')}
            placeholder="G... creator public key"
            className={validationErrors.creator && touchedFields.has('creator') ? 'input-error' : ''}
            required
          />
          {validationErrors.creator && touchedFields.has('creator') ? (
            <span className="field-error">{validationErrors.creator}</span>
          ) : null}
        </label>

        <label className="field-group">
          <span>Campaign title</span>
          <input
            type="text"
            value={values.title}
            onChange={(event) => update('title', event.target.value)}
            onBlur={() => handleFieldBlur('title')}
            placeholder="Stellar community design sprint"
            minLength={4}
            maxLength={80}
            className={validationErrors.title && touchedFields.has('title') ? 'input-error' : ''}
            required
          />
          {validationErrors.title && touchedFields.has('title') ? (
            <span className="field-error">{validationErrors.title}</span>
          ) : null}
        </label>

        <label className="field-group">
          <span>Description</span>
          <textarea
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            onBlur={() => handleFieldBlur('description')}
            placeholder="Describe what the campaign funds, who benefits, and the delivery plan."
            rows={5}
            minLength={20}
            maxLength={500}
            className={validationErrors.description && touchedFields.has('description') ? 'input-error' : ''}
            required
          />
          {validationErrors.description && touchedFields.has('description') ? (
            <span className="field-error">{validationErrors.description}</span>
          ) : null}
        </label>

        <div className="field-group">
          <span>Accepted tokens</span>
          <div className="token-checkboxes">
            {assetOptions.map((asset) => (
              <label key={asset} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={values.acceptedTokens.includes(asset)}
                  onChange={() => toggleToken(asset)}
                  onBlur={() => handleFieldBlur('acceptedTokens')}
                />
                {asset}
              </label>
            ))}
          </div>
          {validationErrors.acceptedTokens && touchedFields.has('acceptedTokens') ? (
            <span className="field-error">{validationErrors.acceptedTokens}</span>
          ) : null}
        </div>

        <label className="field-group">
          <span>Target amount (cumulative sum of units)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={values.targetAmount}
            onChange={(event) => update('targetAmount', event.target.value)}
            onBlur={() => handleFieldBlur('targetAmount')}
            className={validationErrors.targetAmount && touchedFields.has('targetAmount') ? 'input-error' : ''}
            required
          />
          {validationErrors.targetAmount && touchedFields.has('targetAmount') ? (
            <span className="field-error">{validationErrors.targetAmount}</span>
          ) : null}
        </label>

        <label className="field-group">
          <span>Deadline in hours</span>
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={values.deadlineHours}
            onChange={(event) => update('deadlineHours', event.target.value)}
            onBlur={() => handleFieldBlur('deadlineHours')}
            className={validationErrors.deadlineHours && touchedFields.has('deadlineHours') ? 'input-error' : ''}
            required
          />
          {validationErrors.deadlineHours && touchedFields.has('deadlineHours') ? (
            <span className="field-error">{validationErrors.deadlineHours}</span>
          ) : null}
        </label>

        <div className="field-group">
          <span>Campaign Image (optional)</span>
          <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Upload a banner image (JPG or PNG, max 2MB) or provide an image URL
          </p>
          
          {values.imagePreview ? (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                width: '100%', 
                maxWidth: '400px', 
                borderRadius: '8px', 
                overflow: 'hidden',
                border: '1px solid var(--border-color, #e5e7eb)',
              }}>
                <img 
                  src={values.imagePreview} 
                  alt="Campaign preview" 
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={clearImage}
                className="btn-ghost"
                style={{ marginTop: '0.5rem' }}
              >
                Remove image
              </button>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageFileChange}
                disabled={!!values.imageUrl.trim()}
                style={{ marginBottom: '0.5rem' }}
              />
              {imageError && (
                <span className="field-error">{imageError}</span>
              )}
              
              <div style={{ margin: '1rem 0', textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>
                — or —
              </div>
              
              <input
                type="url"
                value={values.imageUrl}
                onChange={(event) => update('imageUrl', event.target.value)}
                placeholder="https://example.com/image.png"
                disabled={!!values.imagePreview}
              />
            </>
          )}
        </div>

        <label className="field-group">
          <span>External Link (optional)</span>
          <input
            type="url"
            value={values.externalLink}
            onChange={(event) => update('externalLink', event.target.value)}
            placeholder="https://example.com/project"
          />
        </label>

        {apiError ? (
          <div className="form-error">
            <p>{apiError.message}</p>
            {apiError.details && apiError.details.length > 0 ? (
              <ul className="error-details">
                {apiError.details.map((detail, index) => (
                  <li key={`${detail.field}-${index}`}>
                    <strong>{detail.field}:</strong> {detail.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {apiError.code ? (
              <small className="error-meta">
                Code: {apiError.code}
                {apiError.requestId ? ` | Request ID: ${apiError.requestId}` : ''}
              </small>
            ) : null}
          </div>
        ) : null}

        <button
          className="btn-primary"
          type="submit"
          disabled={isSubmitting || !isFormValid(validationErrors)}
        >
          {isSubmitting ? 'Creating...' : 'Create campaign'}
        </button>
      </form>
    </section>
  );
}
