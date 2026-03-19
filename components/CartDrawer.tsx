'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Trash2, ArrowRight, Phone } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

const CartDrawer = () => {
  const { cart, removeFromCart, totalPrice, isCartOpen, setIsCartOpen, totalItems } = useCart();
  const { user } = useAuth();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-brand-bg border-l border-white/10 z-[101] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-brand-text uppercase tracking-widest">Your Cart</h2>
                  <p className="text-[10px] text-brand-text/40 font-black uppercase tracking-widest">{totalItems} Items</p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-brand-text/60"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-brand-text/20 border border-white/5">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-brand-text uppercase tracking-widest">Your cart is empty</h3>
                    <p className="text-xs text-brand-text/40 font-black uppercase tracking-widest mt-2">Add some premium tools to get started!</p>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="text-primary font-black uppercase tracking-widest text-xs hover:underline mt-4"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex space-x-4 group">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 relative">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-brand-text font-black text-sm uppercase tracking-widest truncate">{item.name}</h4>
                      <p className="text-primary font-black mt-1 text-sm">${item.price}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-brand-text/40 font-black uppercase tracking-widest">Qty: {item.quantity}</span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-brand-text/20 hover:text-accent transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-black/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-brand-text/60 font-black uppercase tracking-widest text-xs">Subtotal</span>
                  <span className="text-2xl font-black text-brand-text">${totalPrice.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-brand-text/40 text-center uppercase tracking-widest font-black">
                  Instant Support & Fast Checkout via WhatsApp
                </p>
                <button
                  onClick={() => {
                    const phoneNumber = "923209310656";
                    const itemsList = cart.map(item => `- ${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('%0A');
                    const message = `Hello Hammad Tools! I would like to purchase:%0A%0A${itemsList}%0A%0ATotal: $${totalPrice.toFixed(2)}%0A%0APlease guide me with the next steps.`;
                    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
                    setIsCartOpen(false);
                  }}
                  className="w-full bg-[#25D366] text-white py-4 rounded-xl font-black flex items-center justify-center space-x-2 shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] transition-transform text-xs uppercase tracking-widest"
                >
                  <Phone className="w-5 h-5 fill-current" />
                  <span>Checkout on WhatsApp</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
