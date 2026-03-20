"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Trash2,
  Plus
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { API_URL } from "@/src/lib/api";

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  unit: string;
  status: string;
}

export default function ExcelModeView() {
  const { user: currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchProducts();
  }, [currentUser]);

  const handleUpdate = async (id: string, field: string, value: any) => {
    setSavingId(id);
    try {
      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        // Update local state without re-fetching
        setProducts(prev => prev.map(p => p._id === id ? { ...p, [field]: value } : p));
      } else {
        toast.error("Update failed");
      }
    } catch (error) {
      toast.error("An error occurred during update");
    } finally {
      setSavingId(null);
    }
  };

  const handleAddRow = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({
          name: "New Product",
          sku: `SKU-${Date.now().toString().slice(-6)}`,
          category: "Electronics",
          stock: 0,
          price: 0,
          unit: "pcs"
        }),
      });

      if (response.ok) {
        fetchProducts();
        toast.success("New row added");
      }
    } catch (error) {
      toast.error("Failed to add product");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });

      if (response.ok) {
        setProducts(prev => prev.filter(p => p._id !== id));
        toast.success("Product deleted");
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Data Entry</h1>
          <p className="text-muted-foreground italic text-sm">Spreadsheet mode: Click any cell to edit. Changes save automatically on focus-out.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Auto-save Active
          </div>
          <Button onClick={handleAddRow} size="sm" className="h-9 gap-2">
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/80 backdrop-blur-md sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-b-2 border-primary/20">
                  <TableHead className="w-[120px] font-black uppercase text-[10px] tracking-widest text-primary/70 py-4">SKU</TableHead>
                  <TableHead className="min-w-[250px] font-black uppercase text-[10px] tracking-widest text-primary/70">Product Name</TableHead>
                  <TableHead className="w-[150px] font-black uppercase text-[10px] tracking-widest text-primary/70">Category</TableHead>
                  <TableHead className="w-[100px] font-black uppercase text-[10px] tracking-widest text-primary/70">Stock</TableHead>
                  <TableHead className="w-[120px] font-black uppercase text-[10px] tracking-widest text-primary/70">Price ($)</TableHead>
                  <TableHead className="w-[80px] font-black uppercase text-[10px] tracking-widest text-primary/70">Unit</TableHead>
                  <TableHead className="w-[100px] font-black uppercase text-[10px] tracking-widest text-primary/70 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                      No data found. Add a row to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product._id} className="group hover:bg-primary/[0.02] transition-colors border-b border-primary/5">
                      <TableCell className="p-0">
                        <Input 
                          defaultValue={product.sku}
                          className="border-none focus-visible:ring-1 focus-visible:ring-primary h-12 rounded-none bg-transparent font-mono text-xs font-bold text-primary/80"
                          onBlur={(e) => {
                            if (e.target.value !== product.sku) handleUpdate(product._id, 'sku', e.target.value);
                          }}
                        />
                      </TableCell>
                      <TableCell className="p-0 border-l border-primary/5">
                        <Input 
                          defaultValue={product.name}
                          className="border-none focus-visible:ring-1 focus-visible:ring-primary h-12 rounded-none bg-transparent font-semibold text-sm"
                          onBlur={(e) => {
                            if (e.target.value !== product.name) handleUpdate(product._id, 'name', e.target.value);
                          }}
                        />
                      </TableCell>
                      <TableCell className="p-0 border-l border-primary/5">
                        <Input 
                          defaultValue={product.category}
                          className="border-none focus-visible:ring-1 focus-visible:ring-primary h-12 rounded-none bg-transparent text-xs"
                          onBlur={(e) => {
                            if (e.target.value !== product.category) handleUpdate(product._id, 'category', e.target.value);
                          }}
                        />
                      </TableCell>
                      <TableCell className="p-0 border-l border-primary/5">
                        <Input 
                          type="number"
                          defaultValue={product.stock}
                          className="border-none focus-visible:ring-1 focus-visible:ring-primary h-12 rounded-none bg-transparent font-bold text-center"
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (val !== product.stock) handleUpdate(product._id, 'stock', val);
                          }}
                        />
                      </TableCell>
                      <TableCell className="p-0 border-l border-primary/5">
                        <Input 
                          type="number"
                          step="0.01"
                          defaultValue={product.price}
                          className="border-none focus-visible:ring-1 focus-visible:ring-primary h-12 rounded-none bg-transparent font-bold text-emerald-500"
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val !== product.price) handleUpdate(product._id, 'price', val);
                          }}
                        />
                      </TableCell>
                      <TableCell className="p-0 border-l border-primary/5">
                        <Input 
                          defaultValue={product.unit}
                          className="border-none focus-visible:ring-1 focus-visible:ring-primary h-12 rounded-none bg-transparent text-center text-xs text-muted-foreground uppercase"
                          onBlur={(e) => {
                            if (e.target.value !== product.unit) handleUpdate(product._id, 'unit', e.target.value);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right px-4 border-l border-primary/5">
                        <div className="flex items-center justify-end gap-2">
                          {savingId === product._id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <div className="h-4 w-4" /> 
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(product._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-600/80 font-medium">
          <strong>Tip:</strong> You can navigate cells using the <kbd className="bg-amber-500/10 px-1 rounded">Tab</kbd> key just like in Excel. Any changes you make are instantly recorded in the system's Audit Log for transparency.
        </p>
      </div>
    </div>
  );
}
