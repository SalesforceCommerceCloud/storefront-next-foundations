import { r as ShopperExperience } from "./types2.js";
import { S as ClientAcknowledgedEvent, l as EventPayload, r as ClientApi } from "./index.js";
import { i as RegionDesignMetadata, n as ComponentDesignMetadata, t as ComponentDecoratorProps } from "./component.types.js";
import React from "react";

//#region src/design/react/context/DesignContext.d.ts

/**
 * Type definition for the Design Context
 * Extends DesignState with additional design-time properties
 */
interface DesignContextType {
  /** Whether design mode is currently active */
  isDesignMode: boolean;
  /** Client API for host communication */
  clientApi?: ClientApi;
  /** Whether the client is connected to the host */
  isConnected: boolean;
  /** The page designer config */
  pageDesignerConfig: EventPayload<ClientAcknowledgedEvent> | null;
  /** Page data that the client has retrieved */
  clientPage: ShopperExperience.schemas['Page'] | null;
  /** Sets the client page data */
  setClientPage: (page: ShopperExperience.schemas['Page']) => void;
}
/**
 * Custom hook to access the design context
 * Provides access to design mode state and component selection functionality
 *
 * @returns The current design context
 */
declare const useDesignContext: () => DesignContextType;
//#endregion
//#region src/design/react/components/page.types.d.ts
interface PageDesignMetadata {
  id: string;
  name: string;
  description?: string;
  archType?: 'controller' | 'headless';
  route?: string;
  supportedAspectTypes?: string[];
  regionDefinitions?: RegionDesignMetadata[];
  attributeDefinitionGroups?: {
    id: string;
    name?: string;
    description?: string;
    attributeDefinitions?: Record<string, unknown>[];
  }[];
}
type PageDecoratorProps<TProps> = React.PropsWithChildren<{
  designMetadata?: PageDesignMetadata;
} & TProps>;
//#endregion
export { type ComponentDecoratorProps, type ComponentDesignMetadata, type PageDecoratorProps, type RegionDesignMetadata, useDesignContext };
//# sourceMappingURL=design-react.d.ts.map