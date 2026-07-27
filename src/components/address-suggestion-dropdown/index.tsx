/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import googleMapsLogo from '/images/GoogleMaps_Logo_Gray_4x.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Spinner } from '@/components/spinner';
import { Typography } from '@/components/typography';

/**
 * Represents a structured formatting object for address suggestions
 */
interface StructuredFormatting {
    main_text?: string;
    secondary_text?: string;
}

/**
 * Represents a term in the address suggestion
 */
interface AddressTerm {
    offset?: number;
    value?: string;
}

/**
 * Represents an address suggestion from Google Places API
 */
export interface AddressSuggestion {
    /** Full description of the address */
    description?: string;
    /** Google Places place ID */
    place_id?: string;
    /** Structured formatting with main and secondary text */
    structured_formatting?: StructuredFormatting;
    /** Array of terms in the suggestion */
    terms?: AddressTerm[];
    /** Types of the place */
    types?: string[];
    /** Place prediction object */
    placePrediction?: object;
}

interface AddressSuggestionDropdownProps {
    /** Array of address suggestions to display */
    suggestions?: AddressSuggestion[];
    /** Whether the dropdown is loading */
    isLoading?: boolean;
    /** Callback when close button is clicked */
    onClose: () => void;
    /** Callback when a suggestion is selected */
    onSelectSuggestion: (suggestion: AddressSuggestion) => void;
    /** Whether the dropdown should be visible */
    isVisible?: boolean;
    /** CSS position property for the dropdown */
    position?: 'absolute' | 'relative' | 'fixed';
    /** Optional CSS class name for additional styling */
    className?: string;
}

/**
 * Address Suggestion Dropdown Component
 * Displays Google-powered address suggestions in a dropdown format
 *
 * @param props - Component props
 * @returns JSX element representing the address suggestion dropdown
 *
 * @example
 * ```tsx
 * <AddressSuggestionDropdown
 *   suggestions={addressSuggestions}
 *   isVisible={showSuggestions}
 *   isLoading={isSearching}
 *   onClose={() => setShowSuggestions(false)}
 *   onSelectSuggestion={(suggestion) => handleSelectAddress(suggestion)}
 * />
 * ```
 */
export default function AddressSuggestionDropdown({
    suggestions = [],
    isLoading = false,
    onClose,
    onSelectSuggestion,
    isVisible = false,
    position = 'absolute',
    className,
}: AddressSuggestionDropdownProps): ReactElement | null {
    const { t } = useTranslation('addressSuggestionDropdown');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onClose]);

    if (!isVisible || suggestions.length === 0) {
        return null;
    }

    const positionClasses = {
        absolute: 'absolute',
        relative: 'relative',
        fixed: 'fixed',
    };

    if (isLoading) {
        return (
            <Card
                className={cn(
                    positionClasses[position],
                    'top-full left-0 right-0 z-[1000] mt-1 gap-0 py-4',
                    className,
                    ''
                )}>
                <CardContent className="flex items-center justify-center gap-2 p-4">
                    <Spinner size="sm" />
                    <Typography variant="muted" as="span">
                        {t('loading')}
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            ref={dropdownRef}
            data-testid="address-suggestion-dropdown"
            className={cn(
                positionClasses[position],
                'top-full left-0 right-0 z-[1000] mt-1 gap-0 py-0',
                className,
                ''
            )}>
            {/* Header - aligned with suggestion items */}
            <div className="flex flex-row items-center justify-between pl-4 pr-2 py-2">
                <Typography variant="muted" as="span" className="font-medium">
                    {t('suggested')}
                </Typography>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={onClose}
                    aria-label={t('closeSuggestions')}>
                    <X className="size-4 text-muted-foreground" />
                </Button>
            </div>

            {/* Suggestions List */}
            <CardContent className="flex flex-col p-0">
                {suggestions.map((suggestion, index) => {
                    const displayText =
                        suggestion.description ||
                        `${suggestion.structured_formatting?.main_text}, ${suggestion.structured_formatting?.secondary_text}`;

                    return (
                        <Button
                            key={suggestion.place_id || index}
                            variant="ghost"
                            className="w-full justify-start !px-4 py-3 h-auto hover:bg-accent"
                            onClick={() => onSelectSuggestion(suggestion)}>
                            <MapPin className="size-4 shrink-0 text-foreground" />
                            <Typography variant="small" as="span" className="truncate font-normal">
                                {displayText}
                            </Typography>
                        </Button>
                    );
                })}
            </CardContent>

            {/* Google Attribution */}
            <CardFooter className="px-4 py-3">
                <img
                    src={googleMapsLogo}
                    alt={t('googleMapsLogoAlt', { defaultValue: 'Google Maps' })}
                    className="w-[98px] h-[18px]"
                />
            </CardFooter>
        </Card>
    );
}
