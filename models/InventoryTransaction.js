class InventoryTransaction {
  constructor(data) {
    this.id = data.id;
    this.product_id = data.product_id;
    this.transaction_type = data.transaction_type;
    this.quantity_change = data.quantity_change;
    this.reference_type = data.reference_type;
    this.reference_id = data.reference_id;
    this.notes = data.notes;
    this.created_at = data.created_at;
  }

  static TRANSACTION_TYPES = ['sale', 'restock', 'adjustment', 'waste'];
  static REFERENCE_TYPES = ['order', 'manual', 'recipe'];

  validate() {
    const errors = [];

    // Validate required fields
    if (this.product_id === undefined || this.product_id === null || this.product_id === '') {
      errors.push('Product ID is required');
    }

    if (!this.transaction_type || this.transaction_type.trim() === '') {
      errors.push('Transaction type is required');
    }

    if (this.quantity_change === undefined || this.quantity_change === null || this.quantity_change === '') {
      errors.push('Quantity change is required');
    }

    // Validate product_id is a positive integer
    if (this.product_id !== undefined && this.product_id !== null && this.product_id !== '') {
      const productId = Number(this.product_id);
      if (!Number.isInteger(productId) || productId < 1) {
        errors.push('Product ID must be a positive integer');
      }
    }

    // Validate transaction_type is from allowed values
    if (this.transaction_type && !InventoryTransaction.TRANSACTION_TYPES.includes(this.transaction_type)) {
      errors.push(`Transaction type must be one of: ${InventoryTransaction.TRANSACTION_TYPES.join(', ')}`);
    }

    // Validate quantity_change is a number (can be negative)
    if (this.quantity_change !== undefined && this.quantity_change !== null && this.quantity_change !== '') {
      const quantityChange = Number(this.quantity_change);
      if (isNaN(quantityChange)) {
        errors.push('Quantity change must be a valid number');
      }
    }

    // Validate reference_type if provided
    if (this.reference_type && !InventoryTransaction.REFERENCE_TYPES.includes(this.reference_type)) {
      errors.push(`Reference type must be one of: ${InventoryTransaction.REFERENCE_TYPES.join(', ')}`);
    }

    // Validate reference_id if reference_type is provided
    if (this.reference_type && this.reference_id !== undefined && this.reference_id !== null) {
      const referenceId = Number(this.reference_id);
      if (!Number.isInteger(referenceId) || referenceId < 1) {
        errors.push('Reference ID must be a positive integer when reference type is provided');
      }
    }

    // Validate notes length if provided
    if (this.notes && (typeof this.notes !== 'string' || this.notes.length > 1000)) {
      errors.push('Notes must be a string with maximum 1000 characters');
    }

    return errors;
  }

  isValid() {
    return this.validate().length === 0;
  }

  toJSON() {
    return {
      id: this.id,
      product_id: this.product_id,
      transaction_type: this.transaction_type,
      quantity_change: this.quantity_change,
      reference_type: this.reference_type,
      reference_id: this.reference_id,
      notes: this.notes,
      created_at: this.created_at
    };
  }
}

module.exports = InventoryTransaction;