export class Supplier {
  constructor(
    public id: string,
    public outletId: string,
    public name: string,
    public contactPerson: string | null,
    public email: string | null,
    public phone: string | null,
    public address: string | null,
    public paymentTerms: string | null,
    public leadTimeDays: number,
    public rating: number,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt?: Date
  ) {}
}
