/**
 * The TemplateButtonCallback interface specifies how a Template button will call back to the parent
 * component that is using this button to offer click-to-insert behavior.
 *
 * @param templateText the template text that the button wishes to insert
 */
export interface TemplateButtonCallback {
    (templateText: string): void;
}