import { useMemo } from 'react';
import Select from 'react-select';
import { State, City } from 'country-state-city';

const COUNTRY_CODE = 'IN';
const COUNTRY_NAME = 'India';

const countryOption = { value: COUNTRY_CODE, label: COUNTRY_NAME };

function buildSelectStyles(hasError) {
  return {
    control: (base, state) => ({
      ...base,
      background: 'rgba(255,255,255,0.04)',
      borderColor: hasError
        ? 'var(--color-red)'
        : state.isFocused
          ? 'var(--color-orange)'
          : 'var(--border-color)',
      borderRadius: 'var(--radius-md)',
      borderWidth: '1.5px',
      minHeight: 46,
      boxShadow: state.isFocused ? '0 0 0 3px rgba(249,115,22,0.1)' : 'none',
      cursor: state.isDisabled ? 'default' : 'pointer',
      '&:hover': {
        borderColor: hasError ? 'var(--color-red)' : 'var(--color-orange)',
      },
    }),
    menu: (base) => ({
      ...base,
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      zIndex: 20,
      overflow: 'hidden',
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: 220,
      padding: 4,
    }),
    option: (base, state) => ({
      ...base,
      background: state.isSelected
        ? 'rgba(249,115,22,0.2)'
        : state.isFocused
          ? 'rgba(249,115,22,0.08)'
          : 'transparent',
      color: 'var(--text-primary)',
      borderRadius: 6,
      cursor: 'pointer',
    }),
    singleValue: (base) => ({ ...base, color: 'var(--text-primary)' }),
    input: (base) => ({ ...base, color: 'var(--text-primary)' }),
    placeholder: (base) => ({ ...base, color: 'var(--text-muted)' }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)',
      opacity: state.isDisabled ? 0.5 : 1,
      '&:hover': { color: 'var(--color-orange)' },
    }),
    noOptionsMessage: (base) => ({ ...base, color: 'var(--text-muted)', fontSize: '0.85rem' }),
  };
}

export default function LocationSelectFields({
  stateCode = '',
  state = '',
  city = '',
  onLocationChange,
  errors = {},
}) {
  const stateOptions = useMemo(
    () =>
      State.getStatesOfCountry(COUNTRY_CODE).map((s) => ({
        value: s.isoCode,
        label: s.name,
      })),
    []
  );

  const cityOptions = useMemo(() => {
    if (!stateCode) return [];
    return City.getCitiesOfState(COUNTRY_CODE, stateCode).map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [stateCode]);

  const selectedState = stateOptions.find((o) => o.value === stateCode || o.label === state) || null;
  const selectedCity = cityOptions.find((o) => o.value === city) || (city ? { value: city, label: city } : null);

  const handleStateChange = (option) => {
    onLocationChange({
      country: COUNTRY_NAME,
      stateCode: option?.value || '',
      state: option?.label || '',
      city: '',
    });
  };

  const handleCityChange = (option) => {
    onLocationChange({
      country: COUNTRY_NAME,
      stateCode,
      state,
      city: option?.value || '',
    });
  };

  return (
    <>
      <div className="form-group">
        <label className="form-label">Country</label>
        <Select
          inputId="location-country"
          value={countryOption}
          options={[countryOption]}
          isDisabled
          styles={buildSelectStyles(false)}
          classNamePrefix="location-select"
        />
      </div>

      <div className="form-group">
        <label className="form-label">State</label>
        <Select
          inputId="location-state"
          value={selectedState}
          onChange={handleStateChange}
          options={stateOptions}
          placeholder="Search state..."
          isSearchable
          isClearable
          styles={buildSelectStyles(!!errors.state)}
          classNamePrefix="location-select"
          noOptionsMessage={() => 'No state found'}
        />
        {errors.state && <span className="form-error">⚠ {errors.state}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">City</label>
        <Select
          inputId="location-city"
          value={selectedCity}
          onChange={handleCityChange}
          options={cityOptions}
          placeholder={stateCode ? 'Select city...' : 'Select a state first'}
          isSearchable
          isClearable
          isDisabled={!stateCode}
          styles={buildSelectStyles(!!errors.city)}
          classNamePrefix="location-select"
          noOptionsMessage={() => (stateCode ? 'No city found' : 'Select a state first')}
        />
        {errors.city && <span className="form-error">⚠ {errors.city}</span>}
      </div>
    </>
  );
}
