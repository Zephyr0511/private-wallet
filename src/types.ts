export type WalletCardType = 'image' | 'text'

export interface WalletCard {
  id: string
  type: WalletCardType
  title: string
  content: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface WalletCardDraft {
  type: WalletCardType
  title: string
  content: string
  note: string
}
