import { ReactNode } from "react";

export interface StakingContextState {
  initialized: boolean;

}

export interface ContextProviderProps {
  children: ReactNode;
}