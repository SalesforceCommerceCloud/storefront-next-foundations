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
import { useNavigation, type Fetcher } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormSubmitButtonProps {
    /** Text displayed while the form is being submitted */
    submittingText: string;
    /** Text displayed when the form is idle */
    defaultText: string;
    /** Additional CSS classes to apply to the button */
    className?: string;
    /** Whether the button should be disabled (in addition to auto-disable during submission) */
    disabled?: boolean;
    /**
     * Optional fetcher for independent form submission state.
     *
     * **When to use:**
     * - Multiple forms on the same page that need independent loading states
     * - Forms that shouldn't cause navigation (e.g., "Add to Cart", "Update Settings")
     * - Background operations that stay on the same page
     *
     * **When NOT to use (omit this prop):**
     * - Single form pages (e.g., login, signup, reset password)
     * - Forms that navigate to a different page after submission
     * - When you want to use React Router's regular `Form` component
     *
     * @example
     * ```tsx
     * // Without fetcher (single form, with navigation)
     * <Form method="post">
     *   <FormSubmitButton defaultText="Sign In" submittingText="Signing in..." />
     * </Form>
     *
     * // With fetcher (multiple forms, no navigation)
     * const emailFetcher = useFetcher();
     * <emailFetcher.Form method="post" action="/update-email">
     *   <FormSubmitButton
     *     fetcher={emailFetcher}
     *     defaultText="Update Email"
     *     submittingText="Updating..."
     *   />
     * </emailFetcher.Form>
     * ```
     */
    fetcher?: Fetcher;
}

/**
 * A submit button component that automatically shows loading state during form submission.
 *
 * Features:
 * - Displays a spinner and custom text during submission
 * - Automatically disables during submission to prevent duplicate requests
 * - Supports both React Router Form (with navigation) and Fetcher.Form (without navigation)
 * - Fully accessible with proper disabled states
 *
 * @example Single form with navigation (most common use case)
 * ```tsx
 * import { Form } from 'react-router';
 * import { FormSubmitButton } from '@/components/buttons/form-submit-button';
 *
 * function LoginPage() {
 *   return (
 *     <Form method="post">
 *       <input name="email" type="email" required />
 *       <input name="password" type="password" required />
 *       <FormSubmitButton
 *         defaultText="Sign In"
 *         submittingText="Signing in..."
 *       />
 *     </Form>
 *   );
 * }
 * ```
 *
 * @example Multiple forms with independent states (using fetcher)
 * ```tsx
 * import { useFetcher } from 'react-router';
 * import { FormSubmitButton } from '@/components/buttons/form-submit-button';
 *
 * function AccountSettings() {
 *   const emailFetcher = useFetcher();
 *   const passwordFetcher = useFetcher();
 *
 *   return (
 *     <>
 *       <emailFetcher.Form method="post" action="/account/update-email">
 *         <input name="email" type="email" />
 *         <FormSubmitButton
 *           fetcher={emailFetcher}
 *           defaultText="Update Email"
 *           submittingText="Updating..."
 *         />
 *       </emailFetcher.Form>
 *
 *       <passwordFetcher.Form method="post" action="/account/update-password">
 *         <input name="password" type="password" />
 *         <FormSubmitButton
 *           fetcher={passwordFetcher}
 *           defaultText="Update Password"
 *           submittingText="Updating..."
 *         />
 *       </passwordFetcher.Form>
 *     </>
 *   );
 * }
 * ```
 *
 * @example With custom styling and disabled state
 * ```tsx
 * <FormSubmitButton
 *   defaultText="Submit"
 *   submittingText="Processing..."
 *   className="bg-primary hover:bg-primary/90"
 *   disabled={!isFormValid}
 * />
 * ```
 */
export function FormSubmitButton({
    submittingText,
    defaultText,
    className = 'w-full',
    disabled = false,
    fetcher,
}: FormSubmitButtonProps) {
    const navigation = useNavigation();

    // Use fetcher state if provided, otherwise fall back to navigation state
    const isSubmitting = fetcher ? fetcher.state === 'submitting' : navigation.state === 'submitting';
    const isDisabled = disabled || isSubmitting;

    return (
        <Button type="submit" className={cn(!isDisabled && 'cursor-pointer', className)} disabled={isDisabled}>
            {isSubmitting ? (
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    {submittingText}
                </div>
            ) : (
                defaultText
            )}
        </Button>
    );
}
