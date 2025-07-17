"""
Advanced Machine Learning Pattern Recognition Service
Uses scikit-learn, XGBoost, and PyTorch for SMC pattern detection
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple, Any
import pickle
import json
import os
from pathlib import Path

# Scikit-learn imports
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.pipeline import Pipeline

# XGBoost
import xgboost as xgb

# PyTorch imports
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torch.nn.functional as F

class SMCPatternDataset(Dataset):
    """PyTorch Dataset for SMC pattern data"""
    
    def __init__(self, features: np.ndarray, labels: np.ndarray):
        self.features = torch.FloatTensor(features)
        self.labels = torch.LongTensor(labels)
    
    def __len__(self):
        return len(self.features)
    
    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx]

class SMCPatternCNN(nn.Module):
    """Convolutional Neural Network for SMC pattern recognition"""
    
    def __init__(self, input_size: int, num_classes: int):
        super(SMCPatternCNN, self).__init__()
        self.conv1 = nn.Conv1d(1, 64, kernel_size=3, padding=1)
        self.conv2 = nn.Conv1d(64, 128, kernel_size=3, padding=1)
        self.conv3 = nn.Conv1d(128, 256, kernel_size=3, padding=1)
        
        self.pool = nn.MaxPool1d(2)
        self.dropout = nn.Dropout(0.3)
        
        # Calculate flattened size
        self.flattened_size = 256 * (input_size // 8)
        
        self.fc1 = nn.Linear(self.flattened_size, 512)
        self.fc2 = nn.Linear(512, 256)
        self.fc3 = nn.Linear(256, num_classes)
        
    def forward(self, x):
        x = x.unsqueeze(1)  # Add channel dimension
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = self.pool(F.relu(self.conv3(x)))
        
        x = x.view(-1, self.flattened_size)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        x = self.dropout(x)
        x = self.fc3(x)
        
        return x

class SMCPatternLSTM(nn.Module):
    """LSTM Neural Network for time-series SMC pattern recognition"""
    
    def __init__(self, input_size: int, hidden_size: int, num_layers: int, num_classes: int):
        super(SMCPatternLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.3)
        self.attention = nn.MultiheadAttention(hidden_size, num_heads=8, dropout=0.3)
        self.fc = nn.Linear(hidden_size, num_classes)
        self.dropout = nn.Dropout(0.3)
        
    def forward(self, x):
        # LSTM forward pass
        lstm_out, (h_n, c_n) = self.lstm(x)
        
        # Apply attention mechanism
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        
        # Use last output
        out = attn_out[:, -1, :]
        out = self.dropout(out)
        out = self.fc(out)
        
        return out

class MLPatternRecognitionService:
    """
    Advanced ML service for SMC pattern recognition using multiple algorithms
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.label_encoders = {}
        self.model_status = {
            'random_forest': {'trained': False, 'accuracy': 0.0, 'last_trained': None},
            'svm': {'trained': False, 'accuracy': 0.0, 'last_trained': None},
            'xgboost': {'trained': False, 'accuracy': 0.0, 'last_trained': None},
            'cnn': {'trained': False, 'accuracy': 0.0, 'last_trained': None},
            'lstm': {'trained': False, 'accuracy': 0.0, 'last_trained': None}
        }
        
        # Pattern types for classification
        self.pattern_types = ['BOS', 'CHoCH', 'FVG', 'OB', 'LS']
        self.directions = ['BULLISH', 'BEARISH']
        
        # Model storage paths
        self.model_dir = Path("models")
        self.model_dir.mkdir(exist_ok=True)
        
        # Training data
        self.training_data = []
        self.training_labels = []
        
    async def initialize_models(self):
        """Initialize and load pre-trained models if available"""
        print("🚀 Initializing ML Pattern Recognition Service...")
        
        # Load existing models if available
        await self._load_models()
        
        # Generate synthetic training data for demo
        if not self.training_data:
            await self._generate_synthetic_training_data()
        
        # Train models if not already trained
        if not any(status['trained'] for status in self.model_status.values()):
            await self.train_models()
        
        print("✅ ML Pattern Recognition Service initialized")
    
    async def _generate_synthetic_training_data(self):
        """Generate synthetic training data for SMC patterns"""
        print("📊 Generating synthetic training data...")
        
        np.random.seed(42)  # For reproducibility
        
        # Generate 1000 samples per pattern type
        samples_per_pattern = 1000
        
        for pattern_idx, pattern in enumerate(self.pattern_types):
            for direction_idx, direction in enumerate(self.directions):
                for _ in range(samples_per_pattern):
                    # Generate features based on pattern characteristics
                    features = self._generate_pattern_features(pattern, direction)
                    
                    # Create label (pattern_type + direction)
                    label = f"{pattern}_{direction}"
                    
                    self.training_data.append(features)
                    self.training_labels.append(label)
        
        print(f"📈 Generated {len(self.training_data)} training samples")
    
    def _generate_pattern_features(self, pattern: str, direction: str) -> List[float]:
        """Generate realistic features for a specific pattern and direction"""
        features = []
        
        # Base price action features (20 features)
        base_features = np.random.normal(0, 1, 20)
        
        # Pattern-specific modifications
        if pattern == 'BOS':
            # Break of Structure features
            base_features[0] = 1.5 if direction == 'BULLISH' else -1.5  # Momentum
            base_features[1] = np.random.uniform(0.7, 1.0)  # Volume spike
            base_features[2] = np.random.uniform(0.6, 0.9)  # RSI
            
        elif pattern == 'CHoCH':
            # Change of Character features
            base_features[0] = 1.0 if direction == 'BULLISH' else -1.0  # Momentum shift
            base_features[3] = np.random.uniform(0.5, 0.8)  # Volatility
            base_features[4] = np.random.uniform(0.4, 0.7)  # Trend strength
            
        elif pattern == 'FVG':
            # Fair Value Gap features
            base_features[5] = np.random.uniform(0.8, 1.2)  # Gap size
            base_features[6] = 1.0 if direction == 'BULLISH' else -1.0  # Gap direction
            base_features[7] = np.random.uniform(0.6, 0.9)  # Volume confirmation
            
        elif pattern == 'OB':
            # Order Block features
            base_features[8] = np.random.uniform(0.7, 1.0)  # Block strength
            base_features[9] = 1.0 if direction == 'BULLISH' else -1.0  # Block direction
            base_features[10] = np.random.uniform(0.5, 0.8)  # Rejection strength
            
        elif pattern == 'LS':
            # Liquidity Sweep features
            base_features[11] = 1.0 if direction == 'BULLISH' else -1.0  # Sweep direction
            base_features[12] = np.random.uniform(0.6, 0.9)  # Liquidity level
            base_features[13] = np.random.uniform(0.4, 0.7)  # Sweep strength
        
        # Add technical indicators (30 features)
        technical_features = np.random.normal(0, 0.5, 30)
        
        # Add market structure features (20 features)
        structure_features = np.random.normal(0, 0.3, 20)
        
        # Combine all features
        features = np.concatenate([base_features, technical_features, structure_features])
        
        # Add some noise
        features += np.random.normal(0, 0.1, len(features))
        
        return features.tolist()
    
    async def train_models(self):
        """Train all ML models with current data"""
        print("🏋️ Training ML models...")
        
        if not self.training_data:
            print("❌ No training data available")
            return
        
        X = np.array(self.training_data)
        y = np.array(self.training_labels)
        
        # Create label encoder
        self.label_encoders['patterns'] = LabelEncoder()
        y_encoded = self.label_encoders['patterns'].fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        # Scale features
        self.scalers['standard'] = StandardScaler()
        X_train_scaled = self.scalers['standard'].fit_transform(X_train)
        X_test_scaled = self.scalers['standard'].transform(X_test)
        
        # Train Random Forest
        await self._train_random_forest(X_train_scaled, X_test_scaled, y_train, y_test)
        
        # Train SVM
        await self._train_svm(X_train_scaled, X_test_scaled, y_train, y_test)
        
        # Train XGBoost
        await self._train_xgboost(X_train_scaled, X_test_scaled, y_train, y_test)
        
        # Train CNN
        await self._train_cnn(X_train_scaled, X_test_scaled, y_train, y_test)
        
        # Train LSTM
        await self._train_lstm(X_train_scaled, X_test_scaled, y_train, y_test)
        
        # Save models
        await self._save_models()
        
        print("✅ All models trained successfully")
    
    async def _train_random_forest(self, X_train, X_test, y_train, y_test):
        """Train Random Forest classifier"""
        print("🌲 Training Random Forest...")
        
        rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        rf.fit(X_train, y_train)
        
        # Evaluate
        y_pred = rf.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        self.models['random_forest'] = rf
        self.model_status['random_forest'].update({
            'trained': True,
            'accuracy': accuracy,
            'last_trained': datetime.now().isoformat()
        })
        
        print(f"✅ Random Forest trained - Accuracy: {accuracy:.3f}")
    
    async def _train_svm(self, X_train, X_test, y_train, y_test):
        """Train SVM classifier"""
        print("🔍 Training SVM...")
        
        svm = SVC(
            kernel='rbf',
            C=1.0,
            gamma='scale',
            probability=True,
            random_state=42
        )
        
        svm.fit(X_train, y_train)
        
        # Evaluate
        y_pred = svm.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        self.models['svm'] = svm
        self.model_status['svm'].update({
            'trained': True,
            'accuracy': accuracy,
            'last_trained': datetime.now().isoformat()
        })
        
        print(f"✅ SVM trained - Accuracy: {accuracy:.3f}")
    
    async def _train_xgboost(self, X_train, X_test, y_train, y_test):
        """Train XGBoost classifier"""
        print("🚀 Training XGBoost...")
        
        xgb_model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=8,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )
        
        xgb_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = xgb_model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        self.models['xgboost'] = xgb_model
        self.model_status['xgboost'].update({
            'trained': True,
            'accuracy': accuracy,
            'last_trained': datetime.now().isoformat()
        })
        
        print(f"✅ XGBoost trained - Accuracy: {accuracy:.3f}")
    
    async def _train_cnn(self, X_train, X_test, y_train, y_test):
        """Train CNN model"""
        print("🧠 Training CNN...")
        
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Create datasets
        train_dataset = SMCPatternDataset(X_train, y_train)
        test_dataset = SMCPatternDataset(X_test, y_test)
        
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
        
        # Create model
        model = SMCPatternCNN(X_train.shape[1], len(self.label_encoders['patterns'].classes_))
        model.to(device)
        
        # Training setup
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        
        # Training loop
        model.train()
        for epoch in range(50):
            for batch_features, batch_labels in train_loader:
                batch_features, batch_labels = batch_features.to(device), batch_labels.to(device)
                
                optimizer.zero_grad()
                outputs = model(batch_features)
                loss = criterion(outputs, batch_labels)
                loss.backward()
                optimizer.step()
        
        # Evaluation
        model.eval()
        correct = 0
        total = 0
        
        with torch.no_grad():
            for batch_features, batch_labels in test_loader:
                batch_features, batch_labels = batch_features.to(device), batch_labels.to(device)
                outputs = model(batch_features)
                _, predicted = torch.max(outputs.data, 1)
                total += batch_labels.size(0)
                correct += (predicted == batch_labels).sum().item()
        
        accuracy = correct / total
        
        self.models['cnn'] = model
        self.model_status['cnn'].update({
            'trained': True,
            'accuracy': accuracy,
            'last_trained': datetime.now().isoformat()
        })
        
        print(f"✅ CNN trained - Accuracy: {accuracy:.3f}")
    
    async def _train_lstm(self, X_train, X_test, y_train, y_test):
        """Train LSTM model"""
        print("🔄 Training LSTM...")
        
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Reshape data for LSTM (batch_size, seq_len, input_size)
        sequence_length = 10
        X_train_seq = self._create_sequences(X_train, sequence_length)
        X_test_seq = self._create_sequences(X_test, sequence_length)
        
        # Adjust labels
        y_train_seq = y_train[sequence_length-1:]
        y_test_seq = y_test[sequence_length-1:]
        
        # Create datasets
        train_dataset = SMCPatternDataset(X_train_seq, y_train_seq)
        test_dataset = SMCPatternDataset(X_test_seq, y_test_seq)
        
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
        
        # Create model
        model = SMCPatternLSTM(
            input_size=X_train.shape[1],
            hidden_size=128,
            num_layers=2,
            num_classes=len(self.label_encoders['patterns'].classes_)
        )
        model.to(device)
        
        # Training setup
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        
        # Training loop
        model.train()
        for epoch in range(50):
            for batch_features, batch_labels in train_loader:
                batch_features, batch_labels = batch_features.to(device), batch_labels.to(device)
                
                optimizer.zero_grad()
                outputs = model(batch_features)
                loss = criterion(outputs, batch_labels)
                loss.backward()
                optimizer.step()
        
        # Evaluation
        model.eval()
        correct = 0
        total = 0
        
        with torch.no_grad():
            for batch_features, batch_labels in test_loader:
                batch_features, batch_labels = batch_features.to(device), batch_labels.to(device)
                outputs = model(batch_features)
                _, predicted = torch.max(outputs.data, 1)
                total += batch_labels.size(0)
                correct += (predicted == batch_labels).sum().item()
        
        accuracy = correct / total
        
        self.models['lstm'] = model
        self.model_status['lstm'].update({
            'trained': True,
            'accuracy': accuracy,
            'last_trained': datetime.now().isoformat()
        })
        
        print(f"✅ LSTM trained - Accuracy: {accuracy:.3f}")
    
    def _create_sequences(self, data, seq_length):
        """Create sequences for LSTM training"""
        sequences = []
        for i in range(len(data) - seq_length + 1):
            sequences.append(data[i:i+seq_length])
        return np.array(sequences)
    
    async def get_pattern_predictions(self, historical_data: List[Dict], pair: str) -> List[Dict]:
        """Get ML predictions for patterns in historical data"""
        if not historical_data:
            return []
        
        # Extract features from historical data
        features = self._extract_features(historical_data)
        
        predictions = []
        
        # Get predictions from each model
        for model_name, model in self.models.items():
            if not self.model_status[model_name]['trained']:
                continue
            
            try:
                prediction = await self._predict_with_model(model, model_name, features, pair)
                if prediction:
                    predictions.append(prediction)
            except Exception as e:
                print(f"❌ Error predicting with {model_name}: {e}")
        
        return predictions
    
    async def _predict_with_model(self, model, model_name: str, features: np.ndarray, pair: str) -> Optional[Dict]:
        """Make prediction with a specific model"""
        
        # Scale features
        if 'standard' in self.scalers:
            features_scaled = self.scalers['standard'].transform([features])
        else:
            features_scaled = [features]
        
        try:
            if model_name in ['random_forest', 'svm', 'xgboost']:
                # Scikit-learn models
                pred_proba = model.predict_proba(features_scaled)[0]
                pred_class = model.predict(features_scaled)[0]
                
                # Get class name
                class_name = self.label_encoders['patterns'].inverse_transform([pred_class])[0]
                pattern_type, direction = class_name.split('_')
                
                confidence = max(pred_proba)
                
            elif model_name in ['cnn', 'lstm']:
                # PyTorch models
                device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
                model.eval()
                
                with torch.no_grad():
                    if model_name == 'cnn':
                        features_tensor = torch.FloatTensor(features_scaled).to(device)
                    else:  # LSTM
                        # Create sequence for LSTM
                        sequence = np.tile(features_scaled, (10, 1))
                        features_tensor = torch.FloatTensor([sequence]).to(device)
                    
                    outputs = model(features_tensor)
                    probabilities = F.softmax(outputs, dim=1)
                    pred_class = torch.argmax(probabilities, dim=1).item()
                    confidence = probabilities[0][pred_class].item()
                
                # Get class name
                class_name = self.label_encoders['patterns'].inverse_transform([pred_class])[0]
                pattern_type, direction = class_name.split('_')
            
            else:
                return None
            
            return {
                'pattern_type': pattern_type,
                'direction': direction,
                'confidence': float(confidence),
                'probability': float(confidence),
                'model_name': model_name,
                'model_accuracy': self.model_status[model_name]['accuracy'],
                'features_used': ['price_action', 'volume', 'momentum', 'volatility'],
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"❌ Prediction error with {model_name}: {e}")
            return None
    
    def _extract_features(self, historical_data: List[Dict]) -> np.ndarray:
        """Extract features from historical market data"""
        if not historical_data:
            return np.array([])
        
        df = pd.DataFrame(historical_data)
        
        # Basic price features
        features = []
        
        # Price action features
        if 'close' in df.columns:
            features.extend([
                df['close'].iloc[-1],  # Current close
                df['close'].pct_change().iloc[-1],  # Price change
                df['close'].rolling(5).mean().iloc[-1],  # 5-period MA
                df['close'].rolling(20).mean().iloc[-1],  # 20-period MA
            ])
        
        # Volume features
        if 'volume' in df.columns:
            features.extend([
                df['volume'].iloc[-1],  # Current volume
                df['volume'].rolling(5).mean().iloc[-1],  # 5-period volume MA
            ])
        
        # Volatility features
        if 'high' in df.columns and 'low' in df.columns:
            features.extend([
                (df['high'] - df['low']).iloc[-1],  # Current range
                (df['high'] - df['low']).rolling(5).mean().iloc[-1],  # 5-period range
            ])
        
        # Pad features to expected length (70 features)
        while len(features) < 70:
            features.append(0.0)
        
        return np.array(features[:70])  # Truncate if too long
    
    async def predict_patterns(self, pair: str, timeframe: str, features: List[float]) -> Dict:
        """Predict patterns using ensemble of models"""
        
        # Get predictions from all models
        predictions = []
        
        for model_name, model in self.models.items():
            if not self.model_status[model_name]['trained']:
                continue
            
            try:
                prediction = await self._predict_with_model(model, model_name, np.array(features), pair)
                if prediction:
                    predictions.append(prediction)
            except Exception as e:
                print(f"❌ Error predicting with {model_name}: {e}")
        
        # Ensemble predictions
        if predictions:
            # Vote by confidence-weighted average
            pattern_votes = {}
            direction_votes = {}
            
            for pred in predictions:
                pattern_key = pred['pattern_type']
                direction_key = pred['direction']
                weight = pred['confidence'] * pred['model_accuracy']
                
                pattern_votes[pattern_key] = pattern_votes.get(pattern_key, 0) + weight
                direction_votes[direction_key] = direction_votes.get(direction_key, 0) + weight
            
            # Get best predictions
            best_pattern = max(pattern_votes, key=pattern_votes.get)
            best_direction = max(direction_votes, key=direction_votes.get)
            
            ensemble_confidence = sum(pred['confidence'] for pred in predictions) / len(predictions)
            
            return {
                'pattern_type': best_pattern,
                'direction': best_direction,
                'confidence': ensemble_confidence,
                'individual_predictions': predictions,
                'ensemble_method': 'confidence_weighted_voting',
                'timestamp': datetime.now().isoformat()
            }
        
        return {
            'pattern_type': 'UNKNOWN',
            'direction': 'NEUTRAL',
            'confidence': 0.0,
            'individual_predictions': [],
            'ensemble_method': 'no_models_available',
            'timestamp': datetime.now().isoformat()
        }
    
    async def get_model_status(self) -> Dict:
        """Get current model training status"""
        return {
            'models': self.model_status,
            'training_samples': len(self.training_data),
            'pattern_types': self.pattern_types,
            'directions': self.directions,
            'last_updated': datetime.now().isoformat()
        }
    
    async def _save_models(self):
        """Save trained models to disk"""
        try:
            # Save scikit-learn models
            for model_name in ['random_forest', 'svm', 'xgboost']:
                if model_name in self.models:
                    with open(self.model_dir / f"{model_name}.pkl", 'wb') as f:
                        pickle.dump(self.models[model_name], f)
            
            # Save PyTorch models
            for model_name in ['cnn', 'lstm']:
                if model_name in self.models:
                    torch.save(self.models[model_name].state_dict(), self.model_dir / f"{model_name}.pth")
            
            # Save scalers and encoders
            with open(self.model_dir / "scalers.pkl", 'wb') as f:
                pickle.dump(self.scalers, f)
            
            with open(self.model_dir / "label_encoders.pkl", 'wb') as f:
                pickle.dump(self.label_encoders, f)
            
            # Save model status
            with open(self.model_dir / "model_status.json", 'w') as f:
                json.dump(self.model_status, f, indent=2)
            
            print("💾 Models saved successfully")
            
        except Exception as e:
            print(f"❌ Error saving models: {e}")
    
    async def _load_models(self):
        """Load previously trained models from disk"""
        try:
            # Load scikit-learn models
            for model_name in ['random_forest', 'svm', 'xgboost']:
                model_path = self.model_dir / f"{model_name}.pkl"
                if model_path.exists():
                    with open(model_path, 'rb') as f:
                        self.models[model_name] = pickle.load(f)
            
            # Load scalers and encoders
            scalers_path = self.model_dir / "scalers.pkl"
            if scalers_path.exists():
                with open(scalers_path, 'rb') as f:
                    self.scalers = pickle.load(f)
            
            encoders_path = self.model_dir / "label_encoders.pkl"
            if encoders_path.exists():
                with open(encoders_path, 'rb') as f:
                    self.label_encoders = pickle.load(f)
            
            # Load model status
            status_path = self.model_dir / "model_status.json"
            if status_path.exists():
                with open(status_path, 'r') as f:
                    self.model_status = json.load(f)
            
            print("📂 Models loaded successfully")
            
        except Exception as e:
            print(f"❌ Error loading models: {e}")