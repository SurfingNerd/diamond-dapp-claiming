import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

// Define a type for the slice state
interface AccountState {
  account: String
}

// Define the initial state using that type
const initialState: AccountState = {
  account: '',
}

export const AccountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setActiveAccount: (state, action: PayloadAction<String>) => {
      state.account = action.payload
    },
  },
})

export const { setActiveAccount } = AccountSlice.actions
export default AccountSlice.reducer