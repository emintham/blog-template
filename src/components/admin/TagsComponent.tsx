import React from "react";
import CreatableSelect from "react-select/creatable";
import type { OnChangeValue } from "react-select";
import {
  customReactSelectStyles,
  type SelectOption,
} from "./sharedSelectStyles"; // UPDATED import

interface TagsComponentProps {
  id: string;
  label: string;
  value: string[];
  onChange: (newTags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  onBlur?: () => void;
}

const TagsComponent: React.FC<TagsComponentProps> = ({
  id,
  label,
  value,
  onChange,
  suggestions = [],
  placeholder,
  onBlur,
}) => {
  const suggestionOptions: readonly SelectOption[] = suggestions.map((s) => ({
    // Use SelectOption
    value: s.toLowerCase(),
    label: s,
  }));

  const currentTagOptions: readonly SelectOption[] = // Use SelectOption
    (Array.isArray(value) ? value : []).map((v) => ({
      value: v.toLowerCase(),
      label: v,
    }));

  const handleChange = (newValue: OnChangeValue<SelectOption, true>) => {
    // Use SelectOption
    const newStringValues = newValue
      ? newValue.map((option) => option.value)
      : [];
    onChange(newStringValues);
  };

  const handleCreate = (inputValue: string) => {
    const newTagValue = inputValue.toLowerCase().trim();
    if (!newTagValue) return;

    const newStringValues = [
      ...(Array.isArray(value) ? value : []),
      newTagValue,
    ]
      .map((v) => v.toLowerCase().trim())
      .filter((v, index, self) => self.indexOf(v) === index);

    onChange(newStringValues);
  };

  return (
    <div className="form-field tags-component-field">
      <label htmlFor={id} className="tags-component-label">
        {label}
      </label>
      <CreatableSelect
        inputId={id}
        instanceId={id}
        isMulti
        options={suggestionOptions}
        value={currentTagOptions}
        onChange={handleChange}
        onCreateOption={handleCreate}
        placeholder={placeholder || "Type or select tags..."}
        styles={customReactSelectStyles} // UPDATED to use imported styles
        onBlur={onBlur}
        formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
      />
    </div>
  );
};

export default TagsComponent;
