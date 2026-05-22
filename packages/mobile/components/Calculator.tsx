import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { formatCurrency } from '@karsafin/shared';

interface CalculatorProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (value: number) => void;
  initialValue?: number;
}

const { width } = Dimensions.get('window');

export default function Calculator({ visible, onClose, onConfirm, initialValue = 0 }: CalculatorProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [expression, setExpression] = useState<string>(initialValue > 0 ? initialValue.toString() : '');
  const [result, setResult] = useState<number>(initialValue);

  // Reset when opened
  useEffect(() => {
    if (visible) {
      setExpression(initialValue > 0 ? initialValue.toString() : '');
      setResult(initialValue);
    }
  }, [visible, initialValue]);

  const safeEval = (expr: string): number => {
    try {
      // replace formatting and evaluate safely
      const cleanExpr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '');
      if (!cleanExpr) return 0;
      // Using Function constructor for basic math eval
      const value = new Function(`return ${cleanExpr}`)();
      return isNaN(value) || !isFinite(value) ? 0 : value;
    } catch {
      return 0;
    }
  };

  const handlePress = (val: string) => {
    if (val === 'C') {
      setExpression('');
      setResult(0);
      return;
    }

    if (val === 'DEL') {
      const newExpr = expression.slice(0, -1);
      setExpression(newExpr);
      setResult(safeEval(newExpr));
      return;
    }

    if (val === '=') {
      const finalVal = safeEval(expression);
      setExpression(finalVal.toString());
      setResult(finalVal);
      return;
    }

    if (val === 'OK') {
      const finalVal = safeEval(expression);
      onConfirm(finalVal);
      onClose();
      return;
    }

    // Prevent multiple operators in a row
    const operators = ['+', '-', '×', '÷'];
    if (operators.includes(val) && operators.includes(expression.slice(-1))) {
      const newExpr = expression.slice(0, -1) + val;
      setExpression(newExpr);
      return;
    }

    const newExpr = expression + val;
    setExpression(newExpr);
    
    // Auto calculate intermediate result if the last char is not an operator
    if (!operators.includes(val)) {
      setResult(safeEval(newExpr));
    }
  };

  const buttons = [
    ['C', 'DEL', '÷', '×'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
    ['0', '000', '.', 'OK'],
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.container, { backgroundColor: colors.card, shadowColor: '#000' }]}>
          <View style={styles.dragIndicator} />
          
          <View style={[styles.displayContainer, { borderBottomColor: colors.border }]}>
            <Text style={[styles.expressionText, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
              {expression || '0'}
            </Text>
            <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              Rp {formatCurrency(result)}
            </Text>
          </View>

          <View style={styles.padContainer}>
            {buttons.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((btn) => {
                  const isOperator = ['÷', '×', '-', '+', '='].includes(btn);
                  const isAction = ['C', 'DEL'].includes(btn);
                  const isOk = btn === 'OK';
                  
                  let bgColor = colors.inputBg;
                  let textColor = colors.text;

                  if (isOperator) {
                    bgColor = 'rgba(0,98,255,0.1)';
                    textColor = '#0062ff';
                  } else if (isAction) {
                    bgColor = 'rgba(239,68,68,0.1)';
                    textColor = '#ef4444';
                  } else if (isOk) {
                    bgColor = '#0062ff';
                    textColor = '#ffffff';
                  }

                  return (
                    <TouchableOpacity
                      key={btn}
                      style={[styles.btn, { backgroundColor: bgColor }]}
                      onPress={() => handlePress(btn)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.btnText, { color: textColor, fontWeight: isOk || isOperator ? '700' : '500' }]}>
                        {btn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const btnSize = (width - 40 - 36) / 4; // 40 horizontal padding, 3 * 12 gap

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: 40,
    elevation: 24,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(150,150,150,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  displayContainer: {
    alignItems: 'flex-end',
    paddingBottom: 24,
    marginBottom: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expressionText: {
    fontSize: 24,
    minHeight: 30,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 42,
    fontWeight: '800',
    minHeight: 50,
  },
  padContainer: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  btn: {
    width: btnSize,
    height: btnSize,
    borderRadius: btnSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 24,
  },
});
