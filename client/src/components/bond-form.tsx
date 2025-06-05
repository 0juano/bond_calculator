import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { InsertBond, AmortizationRow, CallRow, PutRow } from "@shared/schema";

interface BondFormProps {
  bondData: Partial<InsertBond>;
  validationErrors: Record<string, string>;
  onDataChange: (updates: Partial<InsertBond>) => void;
  onBuild: () => void;
  isBuilding: boolean;
}

export default function BondForm({ 
  bondData, 
  validationErrors, 
  onDataChange, 
  onBuild, 
  isBuilding 
}: BondFormProps) {

  const handleInputChange = (field: keyof InsertBond, value: any) => {
    onDataChange({ [field]: value });
  };

  const addAmortizationRow = () => {
    const newRow: AmortizationRow = {
      date: "",
      principalPercent: 0,
    };
    onDataChange({
      amortizationSchedule: [...(bondData.amortizationSchedule || []), newRow],
    });
  };

  const removeAmortizationRow = (index: number) => {
    const updated = [...(bondData.amortizationSchedule || [])];
    updated.splice(index, 1);
    onDataChange({ amortizationSchedule: updated });
  };

  const updateAmortizationRow = (index: number, field: keyof AmortizationRow, value: any) => {
    const updated = [...(bondData.amortizationSchedule || [])];
    updated[index] = { ...updated[index], [field]: value };
    onDataChange({ amortizationSchedule: updated });
  };

  const addCallRow = () => {
    const newRow: CallRow = {
      firstCallDate: "",
      lastCallDate: "",
      callPrice: 100,
    };
    onDataChange({
      callSchedule: [...(bondData.callSchedule || []), newRow],
    });
  };

  const removeCallRow = (index: number) => {
    const updated = [...(bondData.callSchedule || [])];
    updated.splice(index, 1);
    onDataChange({ callSchedule: updated });
  };

  const updateCallRow = (index: number, field: keyof CallRow, value: any) => {
    const updated = [...(bondData.callSchedule || [])];
    updated[index] = { ...updated[index], [field]: value };
    onDataChange({ callSchedule: updated });
  };

  const addPutRow = () => {
    const newRow: PutRow = {
      firstPutDate: "",
      lastPutDate: "",
      putPrice: 100,
    };
    onDataChange({
      putSchedule: [...(bondData.putSchedule || []), newRow],
    });
  };

  const removePutRow = (index: number) => {
    const updated = [...(bondData.putSchedule || [])];
    updated.splice(index, 1);
    onDataChange({ putSchedule: updated });
  };

  const updatePutRow = (index: number, field: keyof PutRow, value: any) => {
    const updated = [...(bondData.putSchedule || [])];
    updated[index] = { ...updated[index], [field]: value };
    onDataChange({ putSchedule: updated });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="panel-header">BOND DEFINITION</h2>
        <div className="text-xs terminal-text-muted mb-4">
          Enter bond parameters below. Real-time validation active.
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="section-header">[BASIC_INFO]</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs terminal-text-muted">ISSUER_NAME</Label>
            <Input
              value={bondData.issuer || ""}
              onChange={(e) => handleInputChange("issuer", e.target.value)}
              placeholder="US_TREASURY_CORP"
              className={`form-input ${validationErrors.issuer ? "error-field" : ""}`}
            />
            {validationErrors.issuer && (
              <Badge variant="destructive" className="mt-1 text-xs">
                {validationErrors.issuer}
              </Badge>
            )}
          </div>
          <div>
            <Label className="text-xs terminal-text-muted">CURRENCY</Label>
            <Select
              value={bondData.currency || "USD"}
              onValueChange={(value) => handleInputChange("currency", value)}
            >
              <SelectTrigger className="form-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs terminal-text-muted">CUSIP</Label>
            <Input
              value={bondData.cusip || ""}
              onChange={(e) => handleInputChange("cusip", e.target.value)}
              placeholder="912828XM7"
              className="form-input"
              maxLength={9}
            />
          </div>
          <div>
            <Label className="text-xs terminal-text-muted">ISIN</Label>
            <Input
              value={bondData.isin || ""}
              onChange={(e) => handleInputChange("isin", e.target.value.toUpperCase())}
              placeholder="US9128283M71"
              className={`form-input ${validationErrors.isin ? "error-field" : ""}`}
              maxLength={12}
            />
            {validationErrors.isin && (
              <Badge variant="destructive" className="mt-1 text-xs">
                {validationErrors.isin}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs terminal-text-muted">FACE_VALUE</Label>
            <Input
              type="number"
              value={bondData.faceValue || ""}
              onChange={(e) => handleInputChange("faceValue", parseFloat(e.target.value) || 0)}
              placeholder="1000000"
              className={`form-input ${validationErrors.faceValue ? "error-field" : ""}`}
            />
            {validationErrors.faceValue && (
              <Badge variant="destructive" className="mt-1 text-xs">
                {validationErrors.faceValue}
              </Badge>
            )}
          </div>
          <div>
            <Label className="text-xs terminal-text-muted">COUPON_RATE (%)</Label>
            <Input
              type="number"
              step="0.001"
              value={bondData.couponRate || ""}
              onChange={(e) => handleInputChange("couponRate", parseFloat(e.target.value) || 0)}
              placeholder="5.000"
              className={`form-input ${validationErrors.couponRate ? "error-field" : ""}`}
            />
            {validationErrors.couponRate && (
              <Badge variant="destructive" className="mt-1 text-xs">
                {validationErrors.couponRate}
              </Badge>
            )}
          </div>
          <div>
            <Label className="text-xs terminal-text-muted">FREQUENCY</Label>
            <Select
              value={bondData.paymentFrequency?.toString() || "2"}
              onValueChange={(value) => handleInputChange("paymentFrequency", parseInt(value))}
            >
              <SelectTrigger className="form-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">SEMI_ANNUAL</SelectItem>
                <SelectItem value="4">QUARTERLY</SelectItem>
                <SelectItem value="12">MONTHLY</SelectItem>
                <SelectItem value="1">ANNUAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs terminal-text-muted">ISSUE_DATE</Label>
            <Input
              type="date"
              value={bondData.issueDate || ""}
              onChange={(e) => handleInputChange("issueDate", e.target.value)}
              className={`form-input ${validationErrors.issueDate ? "error-field" : ""}`}
            />
            {validationErrors.issueDate && (
              <Badge variant="destructive" className="mt-1 text-xs">
                {validationErrors.issueDate}
              </Badge>
            )}
          </div>
          <div>
            <Label className="text-xs terminal-text-muted">MATURITY_DATE</Label>
            <Input
              type="date"
              value={bondData.maturityDate || ""}
              onChange={(e) => handleInputChange("maturityDate", e.target.value)}
              className={`form-input ${validationErrors.maturityDate ? "error-field" : ""}`}
            />
            {validationErrors.maturityDate && (
              <Badge variant="destructive" className="mt-1 text-xs">
                {validationErrors.maturityDate}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs terminal-text-muted">FIRST_COUPON_DATE</Label>
            <Input
              type="date"
              value={bondData.firstCouponDate || ""}
              onChange={(e) => handleInputChange("firstCouponDate", e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <Label className="text-xs terminal-text-muted">DAY_COUNT_CONVENTION</Label>
            <Select
              value={bondData.dayCountConvention || "30/360"}
              onValueChange={(value) => handleInputChange("dayCountConvention", value)}
            >
              <SelectTrigger className="form-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30/360">30/360</SelectItem>
                <SelectItem value="ACT/ACT">ACT/ACT</SelectItem>
                <SelectItem value="ACT/360">ACT/360</SelectItem>
                <SelectItem value="ACT/365">ACT/365</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bond Type */}
      <div className="space-y-4">
        <h3 className="section-header">[BOND_TYPE]</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={bondData.isAmortizing || false}
                onCheckedChange={(checked) => handleInputChange("isAmortizing", checked)}
              />
              <Label className="text-xs terminal-text-green">AMORTIZING</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={bondData.isCallable || false}
                onCheckedChange={(checked) => handleInputChange("isCallable", checked)}
              />
              <Label className="text-xs terminal-text-green">CALLABLE</Label>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={bondData.isPuttable || false}
                onCheckedChange={(checked) => handleInputChange("isPuttable", checked)}
              />
              <Label className="text-xs terminal-text-green">PUTTABLE</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={bondData.isFloating || false}
                onCheckedChange={(checked) => handleInputChange("isFloating", checked)}
              />
              <Label className="text-xs terminal-text-green">FLOATING_RATE</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Amortization Schedule */}
      {bondData.isAmortizing && (
        <div className="space-y-4">
          <h3 className="section-header">[AMORTIZATION_SCHEDULE]</h3>
          <div className="terminal-panel p-4">
            <div className="space-y-2">
              {(bondData.amortizationSchedule || []).map((row, index) => (
                <div key={index} className="grid grid-cols-3 gap-2">
                  <Input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateAmortizationRow(index, "date", e.target.value)}
                    className="form-input text-xs"
                    placeholder="Date"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={row.principalPercent}
                    onChange={(e) => updateAmortizationRow(index, "principalPercent", parseFloat(e.target.value) || 0)}
                    className="form-input text-xs"
                    placeholder="Principal %"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeAmortizationRow(index)}
                    className="text-xs"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={addAmortizationRow}
              variant="outline"
              size="sm"
              className="mt-2 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              + ADD ROW
            </Button>
            {validationErrors.amortizationSchedule && (
              <Badge variant="destructive" className="mt-2 text-xs">
                {validationErrors.amortizationSchedule}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Call Schedule */}
      {bondData.isCallable && (
        <div className="space-y-4">
          <h3 className="section-header">[CALL_SCHEDULE]</h3>
          <div className="terminal-panel p-4">
            <div className="space-y-2">
              {(bondData.callSchedule || []).map((row, index) => (
                <div key={index} className="grid grid-cols-4 gap-2">
                  <Input
                    type="date"
                    value={row.firstCallDate}
                    onChange={(e) => updateCallRow(index, "firstCallDate", e.target.value)}
                    className="form-input text-xs"
                    placeholder="First Call"
                  />
                  <Input
                    type="date"
                    value={row.lastCallDate}
                    onChange={(e) => updateCallRow(index, "lastCallDate", e.target.value)}
                    className="form-input text-xs"
                    placeholder="Last Call"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={row.callPrice}
                    onChange={(e) => updateCallRow(index, "callPrice", parseFloat(e.target.value) || 0)}
                    className="form-input text-xs"
                    placeholder="Price"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeCallRow(index)}
                    className="text-xs"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={addCallRow}
              variant="outline"
              size="sm"
              className="mt-2 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              + ADD CALL
            </Button>
            {validationErrors.callSchedule && (
              <Badge variant="destructive" className="mt-2 text-xs">
                {validationErrors.callSchedule}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Put Schedule */}
      {bondData.isPuttable && (
        <div className="space-y-4">
          <h3 className="section-header">[PUT_SCHEDULE]</h3>
          <div className="terminal-panel p-4">
            <div className="space-y-2">
              {(bondData.putSchedule || []).map((row, index) => (
                <div key={index} className="grid grid-cols-4 gap-2">
                  <Input
                    type="date"
                    value={row.firstPutDate}
                    onChange={(e) => updatePutRow(index, "firstPutDate", e.target.value)}
                    className="form-input text-xs"
                    placeholder="First Put"
                  />
                  <Input
                    type="date"
                    value={row.lastPutDate}
                    onChange={(e) => updatePutRow(index, "lastPutDate", e.target.value)}
                    className="form-input text-xs"
                    placeholder="Last Put"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={row.putPrice}
                    onChange={(e) => updatePutRow(index, "putPrice", parseFloat(e.target.value) || 0)}
                    className="form-input text-xs"
                    placeholder="Price"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removePutRow(index)}
                    className="text-xs"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={addPutRow}
              variant="outline"
              size="sm"
              className="mt-2 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              + ADD PUT
            </Button>
            {validationErrors.putSchedule && (
              <Badge variant="destructive" className="mt-2 text-xs">
                {validationErrors.putSchedule}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4 pt-4 border-t border-border">
        <Button
          onClick={onBuild}
          disabled={isBuilding || Object.keys(validationErrors).length > 0}
          className="flex-1 terminal-button"
        >
          {isBuilding ? "BUILDING..." : "> BUILD_BOND.exe"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          {'>'} VALIDATE_ONLY
        </Button>
      </div>

      {/* Validation Errors Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="terminal-panel p-4 border-destructive">
          <div className="font-bold terminal-text-red text-xs mb-2">VALIDATION_ERRORS:</div>
          <div className="space-y-1">
            {Object.entries(validationErrors).map(([field, error]) => (
              <div key={field} className="terminal-text-red text-xs">
                {field.toUpperCase()}: {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
