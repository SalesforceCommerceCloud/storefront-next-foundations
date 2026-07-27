import React from "react";

//#region src/design/react/core/component.types.d.ts

/**
 * Default component constructor interface.
 * Used to define default components that should be instantiated in a region.
 */
interface DefaultComponentConstructor {
  /** Unique identifier for the component instance */
  id: string;
  /** Component type ID to instantiate */
  typeId: string;
  /** Component data/attributes */
  data: Record<string, unknown>;
}
interface RegionDesignMetadata {
  /**
   * The id of the component or region.
   */
  id: string;
  /**
   * The name of the component or region.
   */
  name?: string;
  /**
   * Optional description for the region.
   */
  description?: string;
  /**
   * Maximum number of components allowed in the region.
   */
  maxComponents?: number;
  /**
   * A list of content link UUIDs for component instances in this region.
   */
  contentLinkUuids?: string[];
  /**
   * A list of allowed component types in this region.
   */
  componentTypeInclusions?: string[];
  /**
   * A list of forbidden component types in this region.
   */
  componentTypeExclusions?: string[];
  /**
   * Default components to instantiate when the region is created.
   */
  defaultComponentConstructors?: DefaultComponentConstructor[];
}
interface ComponentDesignMetadata {
  /**
   * The id of the component or region.
   */
  id: string;
  /**
   * The unique identifier for the content link between this component
   * and its parent.
   */
  contentLinkUuid?: string;
  /**
   * Whether the component is a fragment.
   */
  isFragment: boolean;
  /**
   * Whether the component is visible based on the current visiblity rules and context.
   */
  isVisible: boolean;
  /**
   * Whether the component has been localized in the current locale.
   */
  isLocalized: boolean;
  /**
   * The name of the component or region.
   */
  name?: string;
  /**
   * The region definitions for this component.
   */
  regionDefinitions?: RegionDesignMetadata[];
}
type ComponentDecoratorProps<TProps> = React.PropsWithChildren<{
  designMetadata?: ComponentDesignMetadata;
  visible?: boolean;
  localized?: boolean;
} & TProps>;
type RegionDecoratorProps<TProps> = React.PropsWithChildren<{
  designMetadata?: RegionDesignMetadata;
  className?: string;
} & TProps>;
//#endregion
export { RegionDesignMetadata as i, ComponentDesignMetadata as n, RegionDecoratorProps as r, ComponentDecoratorProps as t };
//# sourceMappingURL=component.types.d.ts.map