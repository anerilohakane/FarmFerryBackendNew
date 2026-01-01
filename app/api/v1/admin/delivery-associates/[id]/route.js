import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import DeliveryAssociate from '@/models/DeliveryAssociate';

// PUT - Update delivery associate
export async function PUT(req, { params }) {
  try {
    
    await dbConnect();
    
    const { id } = params;
    const body = await req.json();
    const { name, email, phone, status, vehicleType, address, specialization } = body;
    
    const updateFields = {};
    
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (status) {
      updateFields.status = status;
      updateFields.isActive = status === 'Active';
    }
    if (vehicleType) updateFields['vehicle.type'] = vehicleType;
    if (address) updateFields.address = address;
    if (specialization) updateFields.specialization = specialization;
    
    const updated = await DeliveryAssociate.findByIdAndUpdate(
      id, 
      { $set: updateFields }, 
      { new: true }
    ).select('-password -passwordResetToken -passwordResetExpires');
    
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Delivery associate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        data: { deliveryAssociate: updated },
        message: 'Delivery associate updated successfully'
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Update delivery associate error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete delivery associate
export async function DELETE(req, { params }) {
  try {
    
    await dbConnect();
    
    const { id } = params;
    const deleted = await DeliveryAssociate.findByIdAndDelete(id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Delivery associate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        message: 'Delivery associate deleted successfully'
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Delete delivery associate error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}