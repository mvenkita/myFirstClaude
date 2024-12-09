import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ModularArithmeticCalculator = () => {
  const [num1, setNum1] = useState('');
  const [num2, setNum2] = useState('');
  const [prime, setPrime] = useState('');
  const [operation, setOperation] = useState('add');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Check if a number is prime
  const isPrime = (n) => {
    if (n <= 1) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  };

  // Perform modular arithmetic
  const calculate = () => {
    // Reset previous errors
    setError('');
    setResult(null);

    // Validate inputs
    const a = parseInt(num1);
    const b = parseInt(num2);
    const p = parseInt(prime);

    if (isNaN(a) || isNaN(b) || isNaN(p)) {
      setError('Please enter valid numbers');
      return;
    }

    if (!isPrime(p)) {
      setError('Modulus must be a prime number');
      return;
    }

    // Perform operation
    let calcResult;
    switch (operation) {
      case 'add':
        calcResult = (a + b) % p;
        break;
      case 'subtract':
        calcResult = (((a - b) % p) + p) % p;
        break;
      case 'multiply':
        calcResult = (a * b) % p;
        break;
      case 'divide':
        // Modular multiplicative inverse for division
        const findInverse = (a, m) => {
          for (let x = 1; x < m; x++) {
            if ((a * x) % m === 1) return x;
          }
          return null;
        };
        const inverse = findInverse(b, p);
        if (inverse === null) {
          setError('Division not possible (no multiplicative inverse)');
          return;
        }
        calcResult = (a * inverse) % p;
        break;
      default:
        setError('Invalid operation');
        return;
    }

    setResult(calcResult);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Modular Arithmetic Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Input 
              type="number" 
              placeholder="First Number" 
              value={num1} 
              onChange={(e) => setNum1(e.target.value)}
            />
            <Select 
              value={operation} 
              onValueChange={setOperation}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">+</SelectItem>
                <SelectItem value="subtract">-</SelectItem>
                <SelectItem value="multiply">×</SelectItem>
                <SelectItem value="divide">÷</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="number" 
              placeholder="Second Number" 
              value={num2} 
              onChange={(e) => setNum2(e.target.value)}
            />
          </div>
          
          <Input 
            type="number" 
            placeholder="Prime Modulus" 
            value={prime} 
            onChange={(e) => setPrime(e.target.value)}
          />
          
          <Button 
            onClick={calculate} 
            className="w-full"
          >
            Calculate
          </Button>
          
          {error && (
            <div className="text-red-500 text-center">
              {error}
            </div>
          )}
          
          {result !== null && (
            <div className="text-center text-xl font-bold">
              Result: {result}
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-500 text-center">
          Performs arithmetic operations modulo a prime number
        </div>
      </CardContent>
    </Card>
  );
};

export default ModularArithmeticCalculator;
